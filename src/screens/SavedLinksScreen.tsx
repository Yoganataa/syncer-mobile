import React, { useState, useCallback, useRef, useMemo } from 'react'
import { RefreshControl, Alert, Linking } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { YStack, XStack, Text, Spinner, Input, useTheme } from 'tamagui'
import { Save, Search, UserPlus, RefreshCw, Trash2, ChevronLeft, User, ExternalLink, Loader2 } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import type { SavedLink } from '../types'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { UICard, UICardTitle, UICardDesc, UICircleBtn, UISearchBar, UIActionBtn, UIActionBtnText } from '../components/ui/styled'

const PAGE_SIZE = 25

const SavedLinkItem = React.memo(function SavedLinkItem({
  item, addingCreators, loadingProfiles,
  onAddCreator, onRefreshProfile, onDelete, theme,
}: {
  item: SavedLink; addingCreators: Set<string>; loadingProfiles: Set<string>
  onAddCreator: (u: string) => void; onRefreshProfile: (u: string) => void; onDelete: (u: string) => void
  theme: ReturnType<typeof useTheme>
}) {
  const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n)
  return (
    <UICard marginBottom="$2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
      <XStack gap="$3" alignItems="center">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '$cardBorder' as any }}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
        ) : (
          <XStack width={48} height={48} borderRadius={24} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
            <User size={22} color={theme.textMuted?.val} />
          </XStack>
        )}
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center">
            <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={1}>
              @{item.username}
            </Text>
            {item.is_creator && <Badge variant="success" label="Creator" />}
          </XStack>
          {item.display_name && (
            <Text fontSize={13} color="$textSecondary" numberOfLines={1}>{item.display_name}</Text>
          )}
          <XStack gap="$3" alignItems="center">
            {item.profile_info?.follower_count != null && item.profile_info.follower_count > 0 && (
              <XStack gap="$1" alignItems="center">
                <Text fontSize={11} color="$textMuted">{formatCount(item.profile_info.follower_count)} followers</Text>
              </XStack>
            )}
            {item.urls?.[0]?.includes('tiktok.com') && (
              <XStack backgroundColor="$bg" borderRadius={4} paddingHorizontal={6} paddingVertical={2}>
                <Text fontSize={11} fontWeight="600" color="$textMuted">TikTok</Text>
              </XStack>
            )}
          </XStack>
        </YStack>
        {!item.is_creator && (
          <YStack backgroundColor="$accent" borderRadius="$5" paddingHorizontal={12} paddingVertical={8} alignItems="center" pressStyle={{ opacity: 0.8, scale: 0.97 }} onPress={() => onAddCreator(item.username)}>
            {addingCreators.has(item.username) ? (
              <Loader2 size={14} color="white" />
            ) : (
              <UserPlus size={14} color="white" />
            )}
            <Text fontSize={11} fontWeight="700" color="white" marginTop={2}>Add</Text>
          </YStack>
        )}
      </XStack>

      <XStack gap="$2" marginTop="$3" justifyContent="flex-end" borderTopWidth={1} borderTopColor="$divider" paddingTop="$3">
        <UIActionBtn color="default" onPress={() => onRefreshProfile(item.username)}>
          {loadingProfiles.has(item.username) ? (
            <Loader2 size={12} color={theme.textSecondary?.val} />
          ) : (
            <RefreshCw size={12} color={theme.textSecondary?.val} />
          )}
          <UIActionBtnText color="default">Refresh</UIActionBtnText>
        </UIActionBtn>
        <UIActionBtn color="default" onPress={() => item.urls?.[0] ? Linking.openURL(item.urls[0]) : null}>
          <ExternalLink size={12} color={theme.textSecondary?.val} />
          <UIActionBtnText color="default">Open</UIActionBtnText>
        </UIActionBtn>
        <UIActionBtn color="danger" onPress={() => onDelete(item.username)}>
          <Trash2 size={12} color={theme.destructive?.val} />
          <UIActionBtnText color="danger">Delete</UIActionBtnText>
        </UIActionBtn>
      </XStack>
    </UICard>
  )
})

interface Props {
  onBack?: () => void
}

export default function SavedLinksScreen({ onBack }: Props) {
  const theme = useTheme()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const refreshingRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingProfiles, setLoadingProfiles] = useState<Set<string>>(new Set())
  const [addingCreators, setAddingCreators] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const savedLog = log.extend('SavedLinks')

  const { data: links = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.savedLinks.all,
    queryFn: () => api.get<SavedLink[]>('/saved/'),
    refetchInterval: 60_000,
    staleTime: 60_000,
  })

  const onRefresh = useCallback(async () => {
    refreshingRef.current = true
    await refetch()
    refreshingRef.current = false
  }, [refetch])

  const filtered = useMemo(() => {
    if (!searchQuery) return links
    const q = searchQuery.toLowerCase()
    return links.filter((l) =>
      l.username.toLowerCase().includes(q) ||
      l.display_name?.toLowerCase().includes(q)
    )
  }, [links, searchQuery])

  const paginated = useMemo(() => {
    const start = 0
    const end = currentPage * PAGE_SIZE
    return filtered.slice(start, end)
  }, [filtered, currentPage])

  const hasMore = paginated.length < filtered.length

  const handleAddCreator = async (username: string) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.savedLinks.all })
    const prev = queryClient.getQueryData<SavedLink[]>(queryKeys.savedLinks.all)
    if (prev) {
      queryClient.setQueryData<SavedLink[]>(queryKeys.savedLinks.all, prev.map((l) =>
        l.username === username ? { ...l, is_creator: true } : l
      ))
    }
    setAddingCreators((prevSet) => new Set(prevSet).add(username))
    try {
      await api.post('/creators/onboard', { username })
      savedLog.info('added as creator:', username)
      show('Added as creator', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLinks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    } catch (e: unknown) {
      if (prev) queryClient.setQueryData(queryKeys.savedLinks.all, prev)
      savedLog.error('add creator failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Failed to add creator', 'error')
    } finally {
      setAddingCreators((prevSet) => { const next = new Set(prevSet); next.delete(username); return next })
    }
  }

  const handleRefreshProfile = async (username: string) => {
    setLoadingProfiles((prev) => new Set(prev).add(username))
    try {
      await api.post(`/saved/refresh-profile/${username}`)
      savedLog.info('profile refreshed:', username)
      show('Profile refreshed', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLinks.all })
    } catch (e: unknown) {
      savedLog.error('refresh profile failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Refresh failed', 'error')
    } finally {
      setLoadingProfiles((prev) => { const next = new Set(prev); next.delete(username); return next })
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (username: string) => api.delete(`/saved/${username}`),
    onMutate: async (username) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedLinks.all })
      const prev = queryClient.getQueryData<SavedLink[]>(queryKeys.savedLinks.all)
      if (prev) {
        queryClient.setQueryData<SavedLink[]>(queryKeys.savedLinks.all, prev.filter((l) => l.username !== username))
      }
      return { prev }
    },
    onError: (e: unknown, _username, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.savedLinks.all, ctx.prev)
      savedLog.error('delete link failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Delete failed', 'error')
    },
    onSuccess: () => {
      savedLog.info('link deleted')
      show('Link removed', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLinks.all })
    },
  })

  const handleDelete = useCallback((username: string) => {
    Alert.alert('Remove Link', `Remove @${username} from saved links?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(username) },
    ])
  }, [deleteMutation])

  const renderItem = useCallback(({ item }: { item: SavedLink }) => (
    <SavedLinkItem
      item={item}
      addingCreators={addingCreators}
      loadingProfiles={loadingProfiles}
      onAddCreator={handleAddCreator}
      onRefreshProfile={handleRefreshProfile}
      onDelete={handleDelete}
      theme={theme}
    />
  ), [handleAddCreator, handleRefreshProfile, handleDelete, addingCreators, loadingProfiles, theme])

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <FlashList
      style={{ flex: 1, backgroundColor: '$bg' }}
      data={paginated}
      renderItem={renderItem}
      keyExtractor={(item: SavedLink) => item.username}
      refreshControl={<RefreshControl refreshing={refreshingRef.current} onRefresh={onRefresh} tintColor={(theme.accent?.val || '#00aa13')} />}
      ListHeaderComponent={
        <YStack padding="$5" gap="$3" paddingTop={60}>
          <XStack alignItems="center" gap="$3">
            {onBack && (
              <UICircleBtn onPress={onBack}>
                <ChevronLeft size={22} color={theme.text?.val} />
              </UICircleBtn>
            )}
            <YStack flex={1}>
              <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading">Saved Links</Text>
              <Text fontSize={15} color="$textSecondary">Telegram links & profiles</Text>
            </YStack>
          </XStack>
          <UISearchBar>
            <Search size={16} color={theme.textMuted?.val} />
            <Input
              placeholder="Search saved links..."
              value={searchQuery} onChangeText={setSearchQuery}
              flex={1} size="$4"
              backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
              paddingLeft={0} height={36}
            />
          </UISearchBar>
          <Text color="$textMuted" fontSize={13}>{filtered.length} link{filtered.length !== 1 ? 's' : ''}</Text>
        </YStack>
      }
      ListEmptyComponent={
        <EmptyState
          title={searchQuery ? 'No links match your search.' : 'No saved links yet.'}
          description="Links from Telegram will appear here"
        />
      }
      ListFooterComponent={
        hasMore ? (
          <YStack padding="$4" alignItems="center">
            <UIActionBtn color="default" onPress={() => setCurrentPage((p) => p + 1)}>
              <Text fontSize={13} color="$textSecondary">Load More ({filtered.length - paginated.length} remaining)</Text>
            </UIActionBtn>
          </YStack>
        ) : filtered.length > 0 ? (
          <Text color="$textMuted" fontSize={12} textAlign="center" padding="$4">All {filtered.length} links loaded</Text>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 80 }}
      onEndReached={() => { if (hasMore) setCurrentPage((p) => p + 1) }}
      onEndReachedThreshold={0.5}
    />
  )
}
