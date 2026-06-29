import { useState, useCallback, useMemo } from 'react'
import { RefreshControl, TouchableOpacity, Linking, Modal, ScrollView } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { YStack, XStack, Text, Spinner, Input, useTheme, Button } from 'tamagui'
import { Folder, File, ChevronLeft, Upload, ArrowUpToLine, Search, Download, Eye, Image, Video, X, HardDrive } from 'lucide-react-native'
import { Image as ExpoImage } from 'expo-image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useToast } from '../components/Toast'
import { queryKeys } from '../queryKeys'
import log from '../logger'

interface FileEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  mtime: string
  mime_type?: string | null
  file_count?: number
  folder_count?: number
}

interface Props {
  onBack?: () => void
}

function isVideo(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'ts', 'flv', 'm2ts', 'mts', 'f4v'].includes(ext || '')
}

function isImage(name: string, mime?: string | null) {
  if (mime?.startsWith('image/')) return true
  const ext = name.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')
}

function fmtSize(bytes?: number) {
  if (!bytes || bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function mediaUrl(filePath: string) {
  const base = process.env.EXPO_PUBLIC_API_URL || 'https://syncer-5c6f6cef5712.herokuapp.com/api/v1'
  return `${base}/explorer/media?path=${encodeURIComponent(filePath)}`
}

export default function ExplorerScreen({ onBack }: Props) {
  const theme = useTheme()
  const { show } = useToast()
  const [path, setPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'folder' | 'file'>('all')
  const [previewItem, setPreviewItem] = useState<FileEntry | null>(null)
  const explorerLog = log.extend('Explorer')

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: [...queryKeys.explorer.all, path],
    queryFn: () => api.get<FileEntry[]>(`/explorer/list?path=${encodeURIComponent(path)}`),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const navigateTo = useCallback((name: string) => {
    setPath((prev) => (prev ? `${prev}/${name}` : name))
  }, [])

  const goBack = useCallback(() => {
    setPath((prev) => {
      if (!prev) return prev
      const parts = prev.split('/')
      parts.pop()
      return parts.join('/')
    })
  }, [])

  const handleUpload = useCallback(async (name: string) => {
    try {
      const filePath = path ? `${path}/${name}` : name
      await api.post('/explorer/upload', { path: filePath })
      explorerLog.info('upload queued:', filePath)
      show('Upload queued', 'success')
      refetch()
    } catch (e: unknown) {
      explorerLog.error('upload failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Upload failed', 'error')
    }
  }, [path, show, refetch, explorerLog])

  const handleDownload = useCallback((name: string) => {
    const filePath = path ? `${path}/${name}` : name
    Linking.openURL(mediaUrl(filePath))
  }, [path])

  const handlePreview = useCallback(async (item: FileEntry) => {
    if (item.type === 'directory') {
      navigateTo(item.name)
      return
    }
    if (isVideo(item.name) || isImage(item.name, item.mime_type)) {
      setPreviewItem(item)
    } else {
      handleDownload(item.name)
    }
  }, [navigateTo, handleDownload])

  const breadcrumbs = useMemo(() => {
    if (!path) return []
    return path.split('/')
  }, [path])

  const navigateToBreadcrumb = useCallback((index: number) => {
    const parts = breadcrumbs.slice(0, index + 1)
    setPath(parts.join('/'))
  }, [breadcrumbs])

  const filtered = useMemo(() => {
    let result = items
    const q = searchQuery.toLowerCase()
    if (q) result = result.filter((i) => i.name.toLowerCase().includes(q))
    if (filterType === 'folder') result = result.filter((i) => i.type === 'directory')
    if (filterType === 'file') result = result.filter((i) => i.type === 'file')
    return result
  }, [items, searchQuery, filterType])

  const renderItem = useCallback(({ item }: { item: FileEntry }) => (
    <YStack
      backgroundColor="$card" borderRadius="$6" marginBottom="$2.5" padding="$4"
      pressStyle={{ opacity: 0.85, scale: 0.97 }}
      onPress={() => handlePreview(item)}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$3" alignItems="center" flex={1}>
          {item.type === 'directory'
            ? <Folder size={20} color={theme.accent?.val} />
            : isVideo(item.name)
              ? <Video size={20} color="#6366f1" />
              : isImage(item.name, item.mime_type)
                ? <Image size={20} color="#059669" />
                : <File size={20} color={theme.textMuted?.val} />
          }
          <YStack flex={1} gap="$1">
            <Text color="$text" fontSize={15} fontWeight="500" numberOfLines={1}>{item.name}</Text>
            <XStack gap="$3">
              {item.type === 'directory' && item.file_count != null && (
                <Text color="$textMuted" fontSize={11}>{item.file_count} files</Text>
              )}
              <Text color="$textMuted" fontSize={11}>{new Date(item.mtime).toLocaleDateString()}</Text>
              {item.type === 'file' && item.size != null && (
                <Text color="$textMuted" fontSize={11}>{fmtSize(item.size)}</Text>
              )}
            </XStack>
          </YStack>
        </XStack>
        {item.type === 'file' && (
          <XStack gap="$1">
            <TouchableOpacity onPress={() => handleDownload(item.name)}>
              <YStack width={32} height={32} borderRadius={16} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
                <Download size={14} color={theme.textSecondary?.val} />
              </YStack>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUpload(item.name)}>
              <YStack width={32} height={32} borderRadius={16} backgroundColor="$accent" justifyContent="center" alignItems="center">
                <Upload size={14} color="white" />
              </YStack>
            </TouchableOpacity>
          </XStack>
        )}
      </XStack>
    </YStack>
  ), [handlePreview, handleDownload, handleUpload, theme])

  if (isLoading && items.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <>
      <FlashList
        style={{ flex: 1, backgroundColor: '$bg' as any }}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item: FileEntry) => item.name}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.accent?.val || '#00aa13'} />}
        ListHeaderComponent={
          <YStack padding="$4" paddingBottom="$2">
            <XStack alignItems="center" gap="$3" marginTop="$2" marginBottom="$3">
              {onBack && (
                <TouchableOpacity onPress={onBack}>
                  <YStack width={40} height={40} borderRadius={20} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
                    <ChevronLeft size={22} color={theme.text?.val} />
                  </YStack>
                </TouchableOpacity>
              )}
              <YStack flex={1}>
                <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading">Explorer</Text>
              </YStack>
              {path ? (
                <TouchableOpacity onPress={goBack}>
                  <YStack width={40} height={40} borderRadius={20} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
                    <ArrowUpToLine size={20} color={theme.textSecondary?.val} />
                  </YStack>
                </TouchableOpacity>
              ) : null}
            </XStack>

            {/* Breadcrumbs */}
            <XStack gap="$1" alignItems="center" marginBottom="$3" flexWrap="wrap">
              <TouchableOpacity onPress={() => { setPath(''); setSearchQuery('') }}>
                <YStack paddingHorizontal={8} paddingVertical={4} borderRadius={4} backgroundColor="$cardBorder">
                  <HardDrive size={14} color={theme.textSecondary?.val} />
                </YStack>
              </TouchableOpacity>
              <Text color="$textMuted" fontSize={12}>/</Text>
              {breadcrumbs.length === 0 ? (
                <Text fontSize={13} fontWeight="500" color="$text">Root</Text>
              ) : (
                breadcrumbs.map((part, i) => (
                  <XStack key={i} gap="$1" alignItems="center">
                    <TouchableOpacity onPress={() => navigateToBreadcrumb(i)}>
                      <Text fontSize={13} fontWeight="500" color={i === breadcrumbs.length - 1 ? '$text' : '$accent'}
                        numberOfLines={1}
                      >
                        {part}
                      </Text>
                    </TouchableOpacity>
                    {i < breadcrumbs.length - 1 && <Text color="$textMuted" fontSize={12}>/</Text>}
                  </XStack>
                ))
              )}
            </XStack>

            {/* Search + Filter */}
            <XStack gap="$2" marginBottom="$2">
              <XStack
                flex={1} backgroundColor="$inputBg" borderRadius="$5" borderWidth={1} borderColor="$inputBorder"
                paddingHorizontal="$3" alignItems="center" height={36}
              >
                <Search size={14} color={theme.textMuted?.val} />
                <Input
                  placeholder="Search files..."
                  value={searchQuery} onChangeText={setSearchQuery}
                  flex={1} backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
                  paddingLeft={8} height={36} fontSize={13}
                />
                {isLoading && items.length > 0 && <Spinner size="small" color="$accent" />}
              </XStack>
              <XStack gap="$1" borderRadius="$5" backgroundColor="$cardBorder" padding={2}>
                {(['all', 'folder', 'file'] as const).map((f) => (
                  <TouchableOpacity key={f} onPress={() => setFilterType(f)}>
                    <YStack
                      paddingHorizontal={10} paddingVertical={6} borderRadius={4}
                      backgroundColor={filterType === f ? theme.accent?.val || '#00aa13' : 'transparent'}
                    >
                      <Text fontSize={11} fontWeight="600" color={filterType === f ? 'white' : theme.textMuted?.val || '#999'}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                ))}
              </XStack>
            </XStack>

            {path !== '' && (
              <TouchableOpacity onPress={goBack}>
                <YStack backgroundColor="$card" borderRadius="$6" marginBottom="$1" padding="$3.5" flexDirection="row" gap="$3" alignItems="center">
                  <ArrowUpToLine size={18} color={theme.textSecondary?.val} />
                  <Text fontSize={14} fontWeight="500" color="$textSecondary">.. (parent)</Text>
                </YStack>
              </TouchableOpacity>
            )}
          </YStack>
        }
        ListEmptyComponent={
          !isLoading ? (
            <YStack padding="$10" alignItems="center">
              <Folder size={40} color={theme.divider?.val || '#e8e8e8'} />
              <Text color="$textMuted" textAlign="center" marginTop="$3" fontSize={15}>
                {searchQuery ? 'No files match your search' : 'Empty directory'}
              </Text>
            </YStack>
          ) : null
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      />

      {/* Preview Modal */}
      <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.9)" justifyContent="center">
          <XStack position="absolute" top={50} left={0} right={0} paddingHorizontal="$4" zIndex={10}>
            <YStack flex={1}>
              <Text color="white" fontSize={16} fontWeight="600" numberOfLines={1}>{previewItem?.name}</Text>
            </YStack>
            <TouchableOpacity onPress={() => setPreviewItem(null)}>
              <YStack width={36} height={36} borderRadius={18} backgroundColor="rgba(255,255,255,0.2)" justifyContent="center" alignItems="center">
                <X size={20} color="white" />
              </YStack>
            </TouchableOpacity>
          </XStack>

          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            {previewItem && isImage(previewItem.name, previewItem.mime_type) ? (
              <ExpoImage
                source={{ uri: mediaUrl(path ? `${path}/${previewItem.name}` : previewItem.name) }}
                style={{ width: '100%', height: 400, borderRadius: 12 }}
                contentFit="contain"
              />
            ) : previewItem && isVideo(previewItem.name) ? (
              <YStack width="100%" height={300} backgroundColor="black" borderRadius={12} justifyContent="center" alignItems="center">
                <TouchableOpacity onPress={() => Linking.openURL(mediaUrl(path ? `${path}/${previewItem.name}` : previewItem.name))}>
                  <YStack alignItems="center" gap="$3">
                    <Video size={64} color="white" />
                    <Text color="white" fontSize={16}>Open in browser</Text>
                  </YStack>
                </TouchableOpacity>
              </YStack>
            ) : null}
          </ScrollView>

          <XStack position="absolute" bottom={50} left={0} right={0} justifyContent="center" gap="$4" paddingHorizontal="$4">
            <Button
              backgroundColor="$accent" color="white" borderRadius="$5"
              onPress={() => { if (previewItem) handleDownload(previewItem.name); setPreviewItem(null) }}
              icon={<Download size={16} color="white" />}
            >
              Download
            </Button>
            <Button
              backgroundColor="$bg" color="$text" borderRadius="$5"
              onPress={() => { if (previewItem) Linking.openURL(mediaUrl(path ? `${path}/${previewItem.name}` : previewItem.name)); setPreviewItem(null) }}
              icon={<Eye size={16} color={theme.text?.val} />}
            >
              Open
            </Button>
          </XStack>
        </YStack>
      </Modal>
    </>
  )
}
