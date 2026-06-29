import { useState, useCallback, useRef, useMemo } from 'react'
import React from 'react'
import { RefreshControl, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { YStack, XStack, Text, Spinner, Sheet, Input, ScrollView, useTheme } from 'tamagui'
import { Plus, RefreshCw, Play, Trash2, Search, X } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import type { RelayProfile } from '../types'
import { Toggle } from '../components/ui/Toggle'
import { EmptyState } from '../components/ui/EmptyState'
import { UICard, UICircleBtn, UISearchBar, UIActionBtn, UIActionBtnText, UIBadge, UIBadgeText, UISegment, UISegmentText } from '../components/ui/styled'

const RelayItem = React.memo(function RelayItem({
  item, isRefreshing,
  onToggle, onRefresh, onTest, onDelete, theme,
}: {
  item: RelayProfile; isRefreshing: boolean
  onToggle: (name: string, enabled: boolean) => void; onRefresh: (name: string) => void; onTest: (name: string) => void; onDelete: (name: string) => void
  theme: ReturnType<typeof useTheme>
}) {
  const hasStats = item.stats && (item.stats.copied > 0 || item.stats.forwarded > 0 || item.stats.skipped > 0 || item.stats.failed > 0)
  return (
    <UICard marginBottom="$2" padding="$4">
      <YStack gap="$1">
        <XStack gap="$2" alignItems="center">
          <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={1} flex={1}>
            {item.source_title || item.name}
          </Text>
          <UIBadge color={item.enabled ? 'success' : 'neutral'}>
            <XStack width={6} height={6} borderRadius={3} backgroundColor={item.enabled ? '$accent' : '$textMuted'} />
            <UIBadgeText color={item.enabled ? 'success' : 'neutral'}>{item.enabled ? 'Active' : 'Disabled'}</UIBadgeText>
          </UIBadge>
        </XStack>
        <Text color="$textSecondary" fontSize={13}>@{item.source_username || item.name}</Text>
        <XStack gap="$2" flexWrap="wrap" marginTop={4}>
          <UIBadge>
            <UIBadgeText color="neutral">{item.mode === 'forward_with_sender' ? 'Forward' : 'Copy'}</UIBadgeText>
          </UIBadge>
          <UIBadge>
            <UIBadgeText color="neutral">{item.source_type}</UIBadgeText>
          </UIBadge>
          {item.members_count != null && item.members_count > 0 && (
            <UIBadge>
              <UIBadgeText color="neutral">{item.members_count} members</UIBadgeText>
            </UIBadge>
          )}
          {item.last_message_id != null && item.last_message_id > 0 && (
            <UIBadge>
              <UIBadgeText color="neutral">msg #{item.last_message_id}</UIBadgeText>
            </UIBadge>
          )}
        </XStack>
      </YStack>

      {!!(item.filters?.include_keywords?.length || item.filters?.exclude_keywords?.length) && (
        <XStack gap="$2" flexWrap="wrap" marginTop="$2">
          {item.filters.include_keywords?.map((kw) => (
            <UIBadge key={kw} color="success">
              <UIBadgeText color="success">+{kw}</UIBadgeText>
            </UIBadge>
          ))}
          {item.filters.exclude_keywords?.map((kw) => (
            <UIBadge key={kw} color="destructive">
              <UIBadgeText color="destructive">-{kw}</UIBadgeText>
            </UIBadge>
          ))}
        </XStack>
      )}

      {hasStats && (
        <XStack gap="$4" marginTop="$2">
          <StatMini label="Copied" value={item.stats!.copied} color="$accent" />
          <StatMini label="Fwd" value={item.stats!.forwarded} color="$info" />
          <StatMini label="Skip" value={item.stats!.skipped} color="$warning" />
          <StatMini label="Fail" value={item.stats!.failed} color="$destructive" />
        </XStack>
      )}

      <XStack marginTop="$3" gap="$2" justifyContent="flex-end" alignItems="center" borderTopWidth={1} borderTopColor="$divider" paddingTop="$3">
        <Toggle active={item.enabled} onToggle={(v) => onToggle(item.name, v)} />
        <UIActionBtn color="default" disabled={isRefreshing} onPress={() => onRefresh(item.name)}>
          {isRefreshing ? <Spinner size="small" /> : <RefreshCw size={12} color={theme.textSecondary?.val} />}
          <UIActionBtnText color="default">Refresh</UIActionBtnText>
        </UIActionBtn>
        <UIActionBtn color="default" onPress={() => onTest(item.name)}>
          <Play size={12} color={theme.textSecondary?.val} />
          <UIActionBtnText color="default">Test</UIActionBtnText>
        </UIActionBtn>
        <UIActionBtn color="danger" onPress={() => onDelete(item.name)}>
          <Trash2 size={12} color={theme.destructive?.val} />
          <UIActionBtnText color="danger">Delete</UIActionBtnText>
        </UIActionBtn>
      </XStack>
    </UICard>
  )
})

export default function RelaysScreen() {
  const theme = useTheme()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const refreshingRef = useRef(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSourceChat, setNewSourceChat] = useState('')
  const [newMode, setNewMode] = useState<'copy_hidden_sender' | 'forward_with_sender'>('copy_hidden_sender')
  const [newKinds, setNewKinds] = useState<string[]>(['text', 'document', 'photo', 'video'])
  const [newIncludeKeywords, setNewIncludeKeywords] = useState<string[]>([])
  const [newExcludeKeywords, setNewExcludeKeywords] = useState<string[]>([])
  const [newFileExts, setNewFileExts] = useState<string[]>([])
  const [newMinSize, setNewMinSize] = useState('')
  const [newMaxSize, setNewMaxSize] = useState('')
  const [newSkipWords, setNewSkipWords] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const relayLog = log.extend('Relays')

  const { data: relays = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.relays.all,
    queryFn: () => api.get<RelayProfile[]>('/relays'),
    refetchInterval: 60_000,
    staleTime: 60_000,
  })

  const onRefresh = useCallback(async () => {
    refreshingRef.current = true
    await refetch()
    refreshingRef.current = false
  }, [refetch])

  const filtered = useMemo(() => {
    if (!searchQuery) return relays
    const q = searchQuery.toLowerCase()
    return relays.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.source_title?.toLowerCase().includes(q) ||
      r.source_username?.toLowerCase().includes(q)
    )
  }, [relays, searchQuery])

  const createMutation = useMutation({
    mutationFn: () => api.post('/relays', {
      name: newName.trim(),
      source_chat_id: parseInt(newSourceChat.trim(), 10),
      source_type: 'chat',
      enabled: true,
      mode: newMode,
      filters: {
        kinds: newKinds,
        include_keywords: newIncludeKeywords,
        exclude_keywords: newExcludeKeywords,
        file_ext_include: newFileExts,
        min_file_size: newMinSize ? parseInt(newMinSize, 10) : null,
        max_file_size: newMaxSize ? parseInt(newMaxSize, 10) : null,
      },
      skip_words: newSkipWords,
    }),
    onSuccess: () => {
      relayLog.info('relay created')
      show('Relay created', 'success')
      setSheetOpen(false)
      setNewName(''); setNewSourceChat(''); setNewMode('copy_hidden_sender')
      setNewKinds(['text', 'document', 'photo', 'video'])
      setNewIncludeKeywords([]); setNewExcludeKeywords([])
      setNewFileExts([]); setNewMinSize(''); setNewMaxSize('')
      setNewSkipWords([])
      queryClient.invalidateQueries({ queryKey: queryKeys.relays.all })
    },
    onError: (e: unknown) => {
      relayLog.error('create relay failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Failed to create relay', 'error')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.put(`/relays/${name}`, { enabled }),
    onMutate: async ({ name, enabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.relays.all })
      const prev = queryClient.getQueryData<RelayProfile[]>(queryKeys.relays.all)
      queryClient.setQueryData<RelayProfile[]>(queryKeys.relays.all, (old) =>
        old?.map((r) => (r.name === name ? { ...r, enabled } : r)),
      )
      return { prev }
    },
    onError: (e: unknown, _, context) => {
      queryClient.setQueryData(queryKeys.relays.all, context?.prev)
      relayLog.error('toggle relay failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Toggle failed', 'error')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.relays.all }),
  })

  const refreshInfoMutation = useMutation({
    mutationFn: (name: string) =>
      api.post<{ source_title?: string; members_count?: number }>(`/relays/${name}/refresh-info`),
    onSuccess: (res) => {
      relayLog.info('refresh info success')
      if (res.source_title) show(`Title: ${res.source_title}`, 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.relays.all })
    },
    onError: (e: unknown) => {
      relayLog.error('refresh info failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Refresh failed', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.delete(`/relays/${name}`),
    onSuccess: () => {
      relayLog.info('relay deleted')
      show('Relay deleted', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.relays.all })
    },
    onError: (e: unknown) => {
      relayLog.error('delete relay failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Delete failed', 'error')
    },
  })

  const testMutation = useMutation({
    mutationFn: (name: string) =>
      api.post<{ result?: { copied: number; forwarded: number; skipped: number; failed: number } }>(
        `/relays/${name}/test`, { latest: 1 }
      ),
    onSuccess: (res) => {
      const r = res.result || { copied: 0, forwarded: 0, skipped: 0, failed: 0 }
      relayLog.info('test completed:', r)
      show(`Copied: ${r.copied} · Fwd: ${r.forwarded} · Skip: ${r.skipped} · Fail: ${r.failed}`, 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.relays.all })
    },
    onError: (e: unknown) => {
      relayLog.error('test relay failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Test failed', 'error')
    },
  })

  const handleToggle = useCallback((name: string, enabled: boolean) => {
    toggleMutation.mutate({ name, enabled })
  }, [toggleMutation])

  const handleRefresh = useCallback((name: string) => {
    refreshInfoMutation.mutate(name)
  }, [refreshInfoMutation])

  const handleTest = useCallback((name: string) => {
    testMutation.mutate(name)
  }, [testMutation])

  const handleDelete = useCallback((name: string) => {
    Alert.alert('Delete Relay', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(name) },
    ])
  }, [deleteMutation])

  const renderItem = useCallback(({ item }: { item: RelayProfile }) => {
    const isRefreshing = refreshInfoMutation.isPending && refreshInfoMutation.variables === item.name
    return (
      <RelayItem
        item={item}
        isRefreshing={isRefreshing}
        onToggle={handleToggle}
        onRefresh={handleRefresh}
        onTest={handleTest}
        onDelete={handleDelete}
        theme={theme}
      />
    )
  }, [refreshInfoMutation, handleToggle, handleRefresh, handleTest, handleDelete, theme])

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="$bg">
      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item: RelayProfile) => item.name}
        refreshControl={<RefreshControl refreshing={refreshingRef.current} onRefresh={onRefresh} tintColor={(theme.accent?.val || '#00aa13')} />}
        ListHeaderComponent={
          <YStack padding="$5" gap="$3" paddingTop={60}>
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap="$0.5">
                <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading">Relays</Text>
                <Text fontSize={15} color="$textSecondary">Message relays and forwarding</Text>
              </YStack>
              <UICircleBtn color="primary" onPress={() => setSheetOpen(true)}>
                <Plus size={20} color="white" />
              </UICircleBtn>
            </XStack>
            <UISearchBar>
              <Search size={16} color={theme.textMuted?.val} />
              <Input
                placeholder="Search relays..."
                value={searchQuery} onChangeText={setSearchQuery}
                flex={1} size="$4"
                backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
                paddingLeft={0} height={36}
              />
            </UISearchBar>
            <Text color="$textMuted" fontSize={13}>{filtered.length} relay{filtered.length !== 1 ? 's' : ''}</Text>
          </YStack>
        }
        ListEmptyComponent={<EmptyState title={searchQuery ? 'No relays match your search.' : 'No relays yet.'} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} snapPoints={[90]} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$card">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <Text fontSize={20} fontWeight="700" color="$text">New Relay</Text>
            <XStack width={32} height={32} borderRadius={16} backgroundColor="$bg" justifyContent="center" alignItems="center" onPress={() => setSheetOpen(false)} pressStyle={{ opacity: 0.7, scale: 0.97 }}>
              <X size={18} color={theme.textSecondary?.val} />
            </XStack>
          </XStack>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <YStack gap="$5" paddingBottom="$6">
              <YStack backgroundColor="$bg" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Source</Text>
                <Input
                  placeholder="e.g. TikTok Videos" value={newName} onChangeText={setNewName} autoCapitalize="none"
                  backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" placeholderTextColor="$textMuted" borderRadius="$5"
                  height={44} fontSize={15} paddingHorizontal="$4"
                />
                <YStack gap="$1">
                  <Input
                    placeholder="Source Chat ID (numeric)" value={newSourceChat} onChangeText={setNewSourceChat} keyboardType="number-pad"
                    backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" placeholderTextColor="$textMuted" borderRadius="$5"
                    height={44} fontSize={15} paddingHorizontal="$4"
                  />
                  <Text fontSize={11} color="$textMuted">Find the chat ID by forwarding a message from the source chat to @getidsbot on Telegram</Text>
                </YStack>
                <XStack gap="$2">
                  <UISegment active={newMode === 'copy_hidden_sender'} onPress={() => setNewMode('copy_hidden_sender')}>
                    <UISegmentText active={newMode === 'copy_hidden_sender'}>Copy</UISegmentText>
                    <Text fontSize={11} color={newMode === 'copy_hidden_sender' ? '$accentLight' : '$textMuted'}>Hide sender</Text>
                  </UISegment>
                  <UISegment active={newMode === 'forward_with_sender'} onPress={() => setNewMode('forward_with_sender')}>
                    <UISegmentText active={newMode === 'forward_with_sender'}>Forward</UISegmentText>
                    <Text fontSize={11} color={newMode === 'forward_with_sender' ? '$accentLight' : '$textMuted'}>Keep sender</Text>
                  </UISegment>
                </XStack>
              </YStack>

              <YStack backgroundColor="$bg" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Message Types</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {[
                    { key: 'text', icon: 'T', desc: 'Text messages' },
                    { key: 'document', icon: 'D', desc: 'Files & docs' },
                    { key: 'photo', icon: 'P', desc: 'Photos & images' },
                    { key: 'video', icon: 'V', desc: 'Videos' },
                  ].map(({ key, icon, desc }) => {
                    const selected = newKinds.includes(key)
                    return (
                      <XStack
                        key={key}
                        alignItems="center"
                        gap="$1.5"
                        paddingVertical={8}
                        paddingHorizontal={12}
                        borderRadius="$5"
                        backgroundColor={selected ? '$accentLight' : '$card'}
                        borderWidth={1}
                        borderColor={selected ? '$accent' : '$inputBorder'}
                        onPress={() => setNewKinds(selected ? newKinds.filter((x) => x !== key) : [...newKinds, key])}
                        pressStyle={{ opacity: 0.85, scale: 0.97 }}
                      >
                        <XStack width={22} height={22} borderRadius={6} backgroundColor={selected ? '$accent' : '$bg'} justifyContent="center" alignItems="center">
                          <Text fontSize={11} fontWeight="700" color={selected ? 'white' : '$textMuted'}>{icon}</Text>
                        </XStack>
                        <YStack>
                          <Text fontSize={13} fontWeight="600" color="$text" textTransform="capitalize">{key}</Text>
                          <Text fontSize={11} color="$textMuted">{desc}</Text>
                        </YStack>
                      </XStack>
                    )
                  })}
                </XStack>
              </YStack>

              <YStack backgroundColor="$bg" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Keywords</Text>
                <TagInput label="Include" values={newIncludeKeywords} onAdd={(v) => setNewIncludeKeywords([...newIncludeKeywords, v])} onRemove={(i) => setNewIncludeKeywords(newIncludeKeywords.filter((_, idx) => idx !== i))} />
                <TagInput label="Exclude" values={newExcludeKeywords} onAdd={(v) => setNewExcludeKeywords([...newExcludeKeywords, v])} onRemove={(i) => setNewExcludeKeywords(newExcludeKeywords.filter((_, idx) => idx !== i))} />
              </YStack>

              <YStack backgroundColor="$bg" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">File Filters</Text>
                <TagInput label="Extensions" values={newFileExts} onAdd={(v) => setNewFileExts([...newFileExts, v])} onRemove={(i) => setNewFileExts(newFileExts.filter((_, idx) => idx !== i))} />
                <XStack gap="$3">
                  <YStack flex={1} gap="$1">
                    <Text fontSize={13} color="$textSecondary">Min Size</Text>
                    <Input placeholder="0 (no min)" value={newMinSize} onChangeText={setNewMinSize} keyboardType="number-pad"
                      backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" placeholderTextColor="$textMuted" borderRadius="$5"
                      height={40} fontSize={13} paddingHorizontal="$3"
                    />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <Text fontSize={13} color="$textSecondary">Max Size</Text>
                    <Input placeholder="50 MB" value={newMaxSize} onChangeText={setNewMaxSize} keyboardType="number-pad"
                      backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" placeholderTextColor="$textMuted" borderRadius="$5"
                      height={40} fontSize={13} paddingHorizontal="$3"
                    />
                  </YStack>
                </XStack>
              </YStack>

              <YStack backgroundColor="$bg" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Skip Words</Text>
                <Text fontSize={13} color="$textSecondary">Messages containing these words will be ignored</Text>
                <TagInput label="Skip Words" values={newSkipWords} onAdd={(v) => setNewSkipWords([...newSkipWords, v])} onRemove={(i) => setNewSkipWords(newSkipWords.filter((_, idx) => idx !== i))} />
              </YStack>

              <XStack
                paddingVertical="$4"
                borderRadius="$5"
                backgroundColor={(!newName.trim() || !newSourceChat.trim()) ? '$inputBorder' : '$accent'}
                alignItems="center"
                justifyContent="center"
                marginTop="$1"
                onPress={() => {
                  if (!createMutation.isPending && newName.trim() && newSourceChat.trim()) {
                    createMutation.mutate()
                  }
                }}
                pressStyle={{ opacity: 0.9, scale: 0.97 }}
                opacity={createMutation.isPending || !newName.trim() || !newSourceChat.trim() ? 0.6 : 1}
              >
                {createMutation.isPending ? (
                  <XStack gap="$2" alignItems="center">
                    <Spinner color="white" />
                    <Text fontSize={16} fontWeight="600" color="white">Creating...</Text>
                  </XStack>
                ) : (
                  <Text fontSize={16} fontWeight="600" color={(!newName.trim() || !newSourceChat.trim()) ? '$textMuted' : 'white'}>
                    {!newName.trim() ? 'Enter a name' : !newSourceChat.trim() ? 'Enter source chat ID' : 'Create Relay'}
                  </Text>
                )}
              </XStack>
            </YStack>
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  )
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <YStack alignItems="center">
      <Text fontSize={16} fontWeight="700" color={color}>{value}</Text>
      <Text fontSize={11} color="$textMuted">{label}</Text>
    </YStack>
  )
}

function TagInput({ label, values, onAdd, onRemove }: { label: string; values: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void }) {
  const theme = useTheme()
  const [text, setText] = useState('')
  const inputRef = useRef<any>(null)
  const add = () => {
    const v = text.trim()
    if (v && !values.includes(v)) { onAdd(v); setText('') }
  }
  return (
    <YStack gap="$1">
      <XStack backgroundColor="$card" borderRadius="$5" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$divider">
        <Input
          ref={inputRef}
          placeholder={values.length === 0 ? `Add ${label.toLowerCase()}...` : `+ add more...`}
          value={text} onChangeText={setText}
          onSubmitEditing={add}
          returnKeyType="done"
          flex={1} backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
          height={38} fontSize={15} paddingLeft={0}
        />
        {!!text.trim() && (
          <XStack paddingHorizontal="$2.5" paddingVertical="$1.5" borderRadius={6} backgroundColor="$accent" onPress={add} pressStyle={{ opacity: 0.8 }}>
            <Text fontSize={13} fontWeight="600" color="white">Add</Text>
          </XStack>
        )}
      </XStack>
      {values.length > 0 && (
        <XStack gap="$1" flexWrap="wrap">
          {values.map((v, i) => (
            <XStack key={`${v}-${i}`} backgroundColor="$accentLight" borderRadius={6} paddingHorizontal={8} paddingVertical={4} gap="$1" alignItems="center">
              <Text fontSize={13} fontWeight="500" color="$text">{v}</Text>
              <XStack width={16} height={16} borderRadius={8} backgroundColor="#c8e6c9" justifyContent="center" alignItems="center" onPress={() => onRemove(i)} pressStyle={{ opacity: 0.7, scale: 0.97 }}>
                <X size={10} color={theme.textSecondary?.val} />
              </XStack>
            </XStack>
          ))}
        </XStack>
      )}
    </YStack>
  )
}
