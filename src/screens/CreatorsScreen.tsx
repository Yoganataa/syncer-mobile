import { useState, useCallback, useMemo, useRef } from 'react'
import { RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { YStack, XStack, Text, Spinner, Input, ScrollView, Sheet, useTheme } from 'tamagui'
import { User, Search, Settings, Scan, X } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import type { Creator } from '../types'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { UICard, UICircleBtn, UISearchBar, UISegment, UISegmentText, UIToggleChip, UIToggleChipText } from '../components/ui/styled'

interface Props {
  onSelectCreator?: (username: string) => void
}

export default function CreatorsScreen({ onSelectCreator }: Props) {
  const theme = useTheme()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all')
  const refreshingRef = useRef(false)
  const creatorLog = log.extend('Creators')

  const { data: creators = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.creators.all,
    queryFn: () => api.get<Creator[]>('/creators/'),
    refetchInterval: 30_000,
    staleTime: 60_000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ username, field, value }: { username: string; field: string; value: boolean }) =>
      api.put(`/creators/${username}`, { [field]: value }),
    onMutate: async ({ username, field, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.creators.all })
      const prev = queryClient.getQueryData<Creator[]>(queryKeys.creators.all)
      queryClient.setQueryData<Creator[]>(queryKeys.creators.all, (old) =>
        old?.map((c) => (c.username === username ? { ...c, [field]: value } : c)),
      )
      return { prev }
    },
    onError: (_, { username, field }, context) => {
      queryClient.setQueryData(queryKeys.creators.all, context?.prev)
      creatorLog.error(`toggle ${field} failed for @${username}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    },
  })

  const [settingsCreator, setSettingsCreator] = useState<Creator | null>(null)
  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({})

  const openSettings = (creator: Creator) => {
    setSettingsForm({
      live_enabled: creator.live_enabled,
      feed_enabled: creator.feed_enabled,
      record_enabled: creator.record_enabled,
      notify_enabled: creator.notify_enabled ?? false,
      bulk_enabled: creator.bulk_enabled ?? false,
      send_message_enabled: creator.send_message_enabled ?? false,
      preferred_quality: (creator as any).preferred_quality || 'best',
      post_types: (creator as any).post_types || 'all',
      proxy_lane: (creator as any).proxy_lane || 'all',
      auth_profile: (creator as any).auth_profile || '',
      notes: (creator as any).notes || '',
    })
    setSettingsCreator(creator)
  }

  const { data: authStatus } = useQuery({
    queryKey: queryKeys.auth.status,
    queryFn: () => api.get<any>('/tools/auth/status'),
    staleTime: 30_000,
  })
  const authProfiles = useMemo(() => {
    const raw = authStatus?.profiles || authStatus?.data?.profiles || []
    return raw.map((p: any) => p.name || p.profile_name || p)
  }, [authStatus])

  const saveSettingsMutation = useMutation({
    mutationFn: ({ username, data }: { username: string; data: Record<string, any> }) =>
      api.put(`/creators/${username}`, data),
    onSuccess: () => {
      creatorLog.info('settings saved')
      setSettingsCreator(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    },
    onError: (e: unknown) => {
      creatorLog.error('save settings failed:', (e as Error).message)
    },
  })

  const scanMutation = useMutation({
    mutationFn: (username: string) => api.post(`/creators/${username}/scan`),
    onSuccess: () => {
      creatorLog.info('scan initiated')
      show('Scan initiated', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    },
    onError: (e: unknown) => {
      creatorLog.error('scan failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Scan failed', 'error')
    },
  })

  const onRefresh = useCallback(async () => {
    refreshingRef.current = true
    await refetch()
    refreshingRef.current = false
  }, [refetch])

  const handleSelectCreator = useCallback(async (username: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.creators.detail(username),
      queryFn: () => api.get<any>(`/creators/${username}`),
      staleTime: 30_000,
    })
    onSelectCreator?.(username)
  }, [queryClient, onSelectCreator])

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      const q = searchQuery.toLowerCase()
      if (q && !c.username.toLowerCase().includes(q) && !(c.display_name?.toLowerCase().includes(q))) return false
      if (statusFilter === 'active' && !c.is_active) return false
      if (statusFilter === 'paused' && c.is_active) return false
      return true
    })
  }, [creators, searchQuery, statusFilter])

  const renderItem = useCallback(({ item }: { item: Creator }) => (
    <UICard marginBottom="$2"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}
    >
      <XStack onPress={() => handleSelectCreator(item.username)} pressStyle={{ opacity: 0.85, scale: 0.97 }} gap="$3" alignItems="center">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '$cardBorder' as any }}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
        ) : (
          <XStack width={44} height={44} borderRadius={22} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
            <User size={20} color={theme.textMuted?.val} />
          </XStack>
        )}
        <YStack flex={1} gap="$1">
          <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={1}>
            @{item.username}
          </Text>
          <XStack gap="$1" alignItems="center">
            <XStack width={6} height={6} borderRadius={3} backgroundColor={item.live_status === 'live' ? '$destructive' : '$textMuted'} />
            <Text fontSize={11} color="$textMuted">{item.live_status === 'live' ? 'LIVE' : item.is_active ? 'Active' : 'Paused'}</Text>
          </XStack>
        </YStack>
      </XStack>

      <XStack gap="$2" marginTop="$3" justifyContent="space-between" alignItems="center">
        <XStack gap="$2" flex={1} flexWrap="wrap">
          <ToggleChip active={item.live_enabled} label="Live" onToggle={(v) => toggleMutation.mutate({ username: item.username, field: 'live_enabled', value: v })} />
          <ToggleChip active={item.feed_enabled} label="Feed" onToggle={(v) => toggleMutation.mutate({ username: item.username, field: 'feed_enabled', value: v })} />
          <ToggleChip active={item.record_enabled} label="Rec" onToggle={(v) => toggleMutation.mutate({ username: item.username, field: 'record_enabled', value: v })} />
          <ToggleChip active={item.notify_enabled ?? false} label="Notify" onToggle={(v) => toggleMutation.mutate({ username: item.username, field: 'notify_enabled', value: v })} />
          <ToggleChip active={item.bulk_enabled ?? false} label="Bulk" onToggle={(v) => toggleMutation.mutate({ username: item.username, field: 'bulk_enabled', value: v })} />
        </XStack>
        <XStack gap="$1">
          <UICircleBtn onPress={() => scanMutation.mutate(item.username)}>
            <Scan size={16} color={theme.textSecondary?.val} />
          </UICircleBtn>
          <UICircleBtn onPress={() => openSettings(item)}>
            <Settings size={16} color={theme.textSecondary?.val} />
          </UICircleBtn>
        </XStack>
      </XStack>
    </UICard>
  ), [toggleMutation, scanMutation, openSettings, handleSelectCreator, theme])

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <>
      <FlashList
        style={{ flex: 1, backgroundColor: '$bg' }}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item: Creator) => item.username}
        refreshControl={<RefreshControl refreshing={refreshingRef.current} onRefresh={onRefresh} tintColor={(theme.accent?.val || '#00aa13')} />}
        ListHeaderComponent={
          <YStack padding="$5" gap="$3" paddingTop={60}>
            <YStack gap="$0.5">
              <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading">Creators</Text>
              <Text fontSize={15} color="$textSecondary">Manage your content creators</Text>
            </YStack>
            <UISearchBar>
              <Search size={16} color={theme.textMuted?.val} />
              <Input
                placeholder="Search creators..."
                value={searchQuery} onChangeText={(t) => setSearchQuery(t)}
                flex={1} size="$4"
                backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
                paddingLeft={0}
              />
            </UISearchBar>
            <XStack gap="$2">
              {(['all', 'active', 'paused'] as const).map((f) => (
                <UISegment key={f} active={statusFilter === f} onPress={() => setStatusFilter(f)}>
                  <UISegmentText active={statusFilter === f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </UISegmentText>
                </UISegment>
              ))}
            </XStack>
            <Text fontSize={13} color="$textMuted">{filtered.length} creator{filtered.length !== 1 ? 's' : ''}</Text>
          </YStack>
        }
        ListEmptyComponent={<EmptyState title={searchQuery || statusFilter !== 'all' ? 'No creators match your filters.' : 'No creators yet.'} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <Sheet open={!!settingsCreator} onOpenChange={(o: boolean) => { if (!o) setSettingsCreator(null) }} snapPoints={[80]} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$card">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <Text fontSize={22} fontWeight="700" color="$text">@{settingsCreator?.username}</Text>
            <UICircleBtn onPress={() => setSettingsCreator(null)}>
              <X size={16} color={theme.textSecondary?.val} />
            </UICircleBtn>
          </XStack>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <YStack gap="$5" paddingBottom="$6">
              <YStack backgroundColor="$cardBorder" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Modules</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {[
                    { key: 'live_enabled', label: 'Live', desc: 'Live stream capture' },
                    { key: 'feed_enabled', label: 'Feed', desc: 'Feed content' },
                    { key: 'record_enabled', label: 'Record', desc: 'Scheduled recording' },
                    { key: 'notify_enabled', label: 'Notify', desc: 'Push notifications' },
                    { key: 'bulk_enabled', label: 'Bulk', desc: 'Bulk download' },
                    { key: 'send_message_enabled', label: 'Send Msg', desc: 'Message sending' },
                  ].map(({ key, label, desc }) => {
                    const active = settingsForm[key]
                    return (
                      <YStack key={key}
                        width="48%" paddingVertical={10} paddingHorizontal={14} borderRadius="$5"
                        backgroundColor={active ? '$accentLight' : '$card'}
                        borderWidth={1} borderColor={active ? '$accent' : '$inputBorder'}
                        pressStyle={{ opacity: 0.85, scale: 0.97 }}
                        onPress={() => setSettingsForm({ ...settingsForm, [key]: !active })}
                      >
                        <XStack gap="$2" alignItems="center">
                          <XStack width={20} height={20} borderRadius={6} backgroundColor={active ? '$accent' : '$cardBorder'} justifyContent="center" alignItems="center">
                            <Text fontSize={11} fontWeight="700" color={active ? 'white' : '$textMuted'}>{active ? '✓' : ''}</Text>
                          </XStack>
                          <YStack>
                            <Text fontSize={13} fontWeight="600" color={active ? '$accent' : '$text'}>{label}</Text>
                            <Text fontSize={11} color="$textMuted">{desc}</Text>
                          </YStack>
                        </XStack>
                      </YStack>
                    )
                  })}
                </XStack>
              </YStack>

              <YStack backgroundColor="$cardBorder" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Routing</Text>
                <YStack gap="$1">
                  <Text fontSize={13} color="$textSecondary">Preferred Quality</Text>
                  <XStack gap="$2">
                    {['best', '1080p', '720p', 'audio_only'].map((q) => (
                      <YStack key={q}
                        flex={1} paddingVertical={10} borderRadius="$5"
                        backgroundColor={settingsForm.preferred_quality === q ? '$accent' : '$card'}
                        borderWidth={1} borderColor={settingsForm.preferred_quality === q ? '$accent' : '$inputBorder'}
                        alignItems="center"
                        pressStyle={{ opacity: 0.85, scale: 0.97 }}
                        onPress={() => setSettingsForm({ ...settingsForm, preferred_quality: q })}
                      >
                        <Text fontSize={11} fontWeight="600" color={settingsForm.preferred_quality === q ? 'white' : '$textMuted'}>{q.replace('_', ' ')}</Text>
                      </YStack>
                    ))}
                  </XStack>
                </YStack>
                <YStack gap="$1">
                  <Text fontSize={13} color="$textSecondary">Post Types</Text>
                  <XStack gap="$2">
                    {['all', 'video', 'image'].map((t) => (
                      <YStack key={t}
                        flex={1} paddingVertical={10} borderRadius="$5"
                        backgroundColor={settingsForm.post_types === t ? '$accent' : '$card'}
                        borderWidth={1} borderColor={settingsForm.post_types === t ? '$accent' : '$inputBorder'}
                        alignItems="center"
                        pressStyle={{ opacity: 0.85, scale: 0.97 }}
                        onPress={() => setSettingsForm({ ...settingsForm, post_types: t })}
                      >
                        <Text fontSize={11} fontWeight="600" color={settingsForm.post_types === t ? 'white' : '$textMuted'} textTransform="capitalize">{t}</Text>
                      </YStack>
                    ))}
                  </XStack>
                </YStack>
                <YStack gap="$1">
                  <Text fontSize={13} color="$textSecondary">Proxy Lane</Text>
                  <XStack gap="$2">
                    {['all', 'residential', 'datacenter', 'none'].map((l) => (
                      <YStack key={l}
                        flex={1} paddingVertical={10} borderRadius="$5"
                        backgroundColor={settingsForm.proxy_lane === l ? '$accent' : '$card'}
                        borderWidth={1} borderColor={settingsForm.proxy_lane === l ? '$accent' : '$inputBorder'}
                        alignItems="center"
                        pressStyle={{ opacity: 0.85, scale: 0.97 }}
                        onPress={() => setSettingsForm({ ...settingsForm, proxy_lane: l })}
                      >
                        <Text fontSize={11} fontWeight="600" color={settingsForm.proxy_lane === l ? 'white' : '$textMuted'} textTransform="capitalize">{l}</Text>
                      </YStack>
                    ))}
                  </XStack>
                </YStack>
              </YStack>

              <YStack backgroundColor="$cardBorder" borderRadius="$5" padding="$4" gap="$3">
                <Text fontSize={16} fontWeight="600" color="$text">Advanced</Text>
                <YStack gap="$1">
                  <Text fontSize={13} color="$textSecondary">Auth Profile</Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {authProfiles.length > 0 ? (
                      <>
                        <YStack
                          paddingVertical={8} paddingHorizontal={14} borderRadius="$5"
                          backgroundColor={!settingsForm.auth_profile ? '$accent' : '$cardBorder'}
                          pressStyle={{ opacity: 0.85, scale: 0.97 }}
                          onPress={() => setSettingsForm({ ...settingsForm, auth_profile: '' })}
                        >
                          <Text fontSize={13} fontWeight="600" color={!settingsForm.auth_profile ? 'white' : '$textSecondary'}>Default</Text>
                        </YStack>
                        {authProfiles.map((name: string) => (
                          <YStack key={name}
                            paddingVertical={8} paddingHorizontal={14} borderRadius="$5"
                            backgroundColor={settingsForm.auth_profile === name ? '$accent' : '$cardBorder'}
                            pressStyle={{ opacity: 0.85, scale: 0.97 }}
                            onPress={() => setSettingsForm({ ...settingsForm, auth_profile: name })}
                          >
                            <Text fontSize={13} fontWeight="600" color={settingsForm.auth_profile === name ? 'white' : '$textSecondary'}>{name}</Text>
                          </YStack>
                        ))}
                      </>
                    ) : (
                      <Input placeholder="Profile name (or leave empty)" value={settingsForm.auth_profile || ''}
                        onChangeText={(v) => setSettingsForm({ ...settingsForm, auth_profile: v })}
                        backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
                        height={40} fontSize={13} paddingHorizontal="$3" flex={1}
                      />
                    )}
                  </XStack>
                </YStack>
                <YStack gap="$1">
                  <Text fontSize={13} color="$textSecondary">Notes</Text>
                  <Input placeholder="Internal notes about this creator..." value={settingsForm.notes || ''}
                    onChangeText={(v) => setSettingsForm({ ...settingsForm, notes: v })}
                    backgroundColor="$card" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
                    height={80} fontSize={13} paddingHorizontal="$3" paddingTop={10}
                    textAlignVertical="top" multiline
                  />
                </YStack>
              </YStack>

              <YStack
                paddingVertical={14} borderRadius="$5" backgroundColor="$accent" alignItems="center" marginTop="$1"
                pressStyle={{ opacity: 0.85, scale: 0.97 }}
                onPress={() => saveSettingsMutation.mutate({ username: settingsCreator!.username, data: settingsForm })}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? <Spinner color="white" /> : <Text fontSize={16} fontWeight="600" color="white">Save Settings</Text>}
              </YStack>
            </YStack>
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

function ToggleChip({ active, label, onToggle }: { active: boolean; label: string; onToggle: (v: boolean) => void }) {
  return (
    <UIToggleChip active={active} onPress={() => onToggle(!active)}>
      <UIToggleChipText active={active}>{label}</UIToggleChipText>
    </UIToggleChip>
  )
}
