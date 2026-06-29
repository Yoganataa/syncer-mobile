import { useState, useMemo, useEffect } from 'react'
import { ScrollView, Switch } from 'react-native'
import { YStack, XStack, Text, Spinner, Button, Input, useTheme } from 'tamagui'
import { ChevronLeft, Save, RefreshCw, Plus, Globe, Radio, Bell, MessageSquare, Scissors, Trash2, Clock, RadioReceiver } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import { UICard, UICardTitle, UICardDesc, UISectionHeader, UIActionBtn, UIActionBtnText, UICircleBtn, UIBadge, UIBadgeText, UISegment, UISegmentText, UIPageTitle } from '../components/ui/styled'

const TOPIC_TYPES = [
  { id: 'download_topic_id', name: 'Downloads', color: '#3b82f6' },
  { id: 'notif_topic_id', name: 'Notifications', color: '#f59e0b' },
  { id: 'log_topic_id', name: 'System Logs', color: '#8b5cf6' },
  { id: 'usn_topic_id', name: 'Username Checks', color: '#06b6d4' },
]

interface SettingsData {
  recorder?: Record<string, any>
  topic_config?: Record<string, any>
  resolver_config?: Record<string, any>
}

interface Props {
  onBack?: () => void
}

export default function SettingsDetailScreen({ onBack }: Props) {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const settingsLog = log.extend('Settings')

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => api.get<SettingsData>('/settings'),
    staleTime: 60_000,
  })

  const { data: topics = [] } = useQuery({
    queryKey: queryKeys.targetTopics.all,
    queryFn: () => api.get<any[]>('/relays/target-topics'),
    staleTime: 60_000,
  })

  const topicValues = useMemo(() => {
    const tc = settings?.topic_config || {}
    return {
      download_topic_id: tc.download_topic_id?.toString() || '',
      notif_topic_id: tc.notif_topic_id?.toString() || '',
      log_topic_id: tc.log_topic_id?.toString() || '',
      usn_topic_id: tc.usn_topic_id?.toString() || '',
      feed_topic_id: tc.feed_topic_id?.toString() || '',
      live_topic_id: tc.live_topic_id?.toString() || '',
    }
  }, [settings])

  const missingTopics = useMemo(() =>
    TOPIC_TYPES.filter((t) => !topicValues[t.id as keyof typeof topicValues]),
    [topicValues],
  )

  const [recorder, setRecorder] = useState({
    is_to_record: false,
    is_to_notify: false,
    is_threaded_mode: false,
    is_remove_ts: false,
    is_to_segment: false,
    auto_delete_recordings: true,
  })
  const [segmentTime, setSegmentTime] = useState('1800')
  const [recordEngine, setRecordEngine] = useState('ffmpeg')
  const [userAgent, setUserAgent] = useState('')
  const [maxLive, setMaxLive] = useState('3')
  const [maxDownloads, setMaxDownloads] = useState('4')
  const [maxUploads, setMaxUploads] = useState('2')
  const [resolverProvider, setResolverProvider] = useState('unified')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized || !settings?.recorder) return
    const s = settings.recorder
    setRecorder({
      is_to_record: s.is_to_record || false,
      is_to_notify: s.is_to_notify || false,
      is_threaded_mode: s.is_threaded_mode || false,
      is_remove_ts: s.is_remove_ts || false,
      is_to_segment: s.is_to_segment || false,
      auto_delete_recordings: s.auto_delete_recordings !== false,
    })
    setSegmentTime(s.segment_time?.toString() || '1800')
    setRecordEngine(s.record_engine || 'ffmpeg')
    setUserAgent(s.user_agent || '')
    setMaxLive(s.max_live_recordings?.toString() || '3')
    setMaxDownloads(s.max_concurrent_downloads?.toString() || '4')
    setMaxUploads(s.max_concurrent_uploads?.toString() || '2')
    setResolverProvider(settings?.resolver_config?.provider || 'unified')
    setInitialized(true)
  }, [initialized, settings])

  const toggleRecorder = (key: keyof typeof recorder) => {
    setRecorder((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const createAutoTopicsMutation = useMutation({
    mutationFn: () => api.post<{ created: Record<string, number> }>('/settings/create-topics'),
    onSuccess: (res) => {
      const count = Object.keys(res.created || {}).length
      const details = Object.entries(res.created || {}).map(([k, v]) => `${k.replace('_topic_id', '')}=${v}`).join(', ')
      settingsLog.info('topics created:', details)
      show(`Created ${count} topic(s): ${details}`, 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.targetTopics.all })
    },
    onError: (e: unknown) => {
      settingsLog.error('create topics failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Failed to create topics', 'error')
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const topic_config = {
        download_topic_id: topicValues.download_topic_id || '',
        feed_topic_id: topicValues.feed_topic_id || '',
        live_topic_id: topicValues.live_topic_id || '',
        notif_topic_id: topicValues.notif_topic_id || '',
        log_topic_id: topicValues.log_topic_id || '',
        usn_topic_id: topicValues.usn_topic_id || '',
      }
      const recorderPayload = {
        ...recorder,
        segment_time: Number(segmentTime) || 1800,
        record_engine: recordEngine,
        user_agent: userAgent,
        max_live_recordings: Number(maxLive) || 3,
        max_concurrent_downloads: Number(maxDownloads) || 4,
        max_concurrent_uploads: Number(maxUploads) || 2,
      }
      return api.put('/settings', { topic_config, recorder: recorderPayload, resolver_config: { provider: resolverProvider } })
    },
    onSuccess: () => {
      settingsLog.info('settings saved')
      show('Settings saved', 'success')
      setInitialized(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
    },
    onError: (e: unknown) => {
      settingsLog.error('save settings failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Save failed', 'error')
    },
  })

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  // ─── Recorder Toggle Config ──────────────────────
  const recorderToggles: { key: keyof typeof recorder; label: string; icon: any; color: string }[] = [
    { key: 'is_to_record', label: 'Master Record Switch', icon: Radio, color: theme.accent!.val },
    { key: 'is_to_notify', label: 'Broadcast Notifications', icon: Bell, color: '#f59e0b' },
    { key: 'is_threaded_mode', label: 'Private Threaded Mode', icon: MessageSquare, color: '#8b5cf6' },
    { key: 'is_to_segment', label: 'Video Segmentation', icon: Scissors, color: '#06b6d4' },
    { key: 'is_remove_ts', label: 'Clean TS Files', icon: Trash2, color: '#dc2626' },
    { key: 'auto_delete_recordings', label: 'Auto-Delete Recordings', icon: Clock, color: '#6366f1' },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg!.val }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ──────────────────────────────── */}
      <XStack alignItems="center" gap="$3" marginBottom="$6">
        {onBack && (
          <UICircleBtn onPress={onBack}>
            <ChevronLeft size={22} color={theme.text!.val} />
          </UICircleBtn>
        )}
        <UIPageTitle>Settings</UIPageTitle>
      </XStack>

      {/* ── Topic Routing ────────────────────────── */}
      <YStack marginBottom={12}>
        <UISectionHeader>Topic Routing</UISectionHeader>
        <UICard>
          <YStack gap="$2">
            {TOPIC_TYPES.map((item) => {
              const val = topicValues[item.id as keyof typeof topicValues]
              const isActive = !!val
              const topicTitle = topics.find((t: any) => t.id?.toString() === val)?.title
              return (
                <XStack key={item.id} gap="$3" alignItems="center">
                  <XStack width={8} height={8} borderRadius={4} backgroundColor={item.color} />
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color="$text">{item.name}</Text>
                    <Text fontSize={11} color="$textMuted">
                      {isActive ? topicTitle || `Topic #${val}` : 'Not configured'}
                    </Text>
                  </YStack>
                  <XStack
                    backgroundColor={isActive ? item.color + '20' : '$cardBorder'}
                    paddingHorizontal={8} paddingVertical={3} borderRadius={6}
                  >
                    <Text fontSize={11} fontWeight="700" color={isActive ? item.color : '$textMuted'}>
                      {isActive ? 'Active' : 'Pending'}
                    </Text>
                  </XStack>
                </XStack>
              )
            })}
          </YStack>
        </UICard>
      </YStack>

      {missingTopics.length > 0 && (
        <YStack
          marginBottom="$5" paddingVertical={14} borderRadius="$5"
          borderWidth={1} borderColor="$divider" borderStyle="dashed"
          backgroundColor="$inputBg" alignItems="center"
          pressStyle={{ opacity: 0.8, scale: 0.97 }}
          onPress={() => createAutoTopicsMutation.mutate()}
          opacity={createAutoTopicsMutation.isPending ? 0.5 : 1}
        >
          <XStack gap="$1.5" alignItems="center" justifyContent="center">
            {createAutoTopicsMutation.isPending ? (
              <Spinner size="small" color="$textMuted" />
            ) : (
              <Plus size={14} color="$textMuted" />
            )}
            <Text fontSize={13} fontWeight="600" color="$textMuted">
              {createAutoTopicsMutation.isPending ? 'Creating...' : `Auto-Create Missing Topics (${missingTopics.length})`}
            </Text>
          </XStack>
        </YStack>
      )}

      {/* ── Recorder Engine ──────────────────────── */}
      <YStack marginBottom={12}>
        <UISectionHeader>Recorder Engine</UISectionHeader>
        <UICard>
          <UICardTitle>Recorder Engine</UICardTitle>
          <UICardDesc marginBottom={16}>Fine-tune how live streams are captured and processed.</UICardDesc>
          {recorderToggles.map(({ key, label, icon: Icon, color }) => (
            <XStack key={key} alignItems="center" paddingVertical={6}>
              <XStack width={22}>
                <Icon size={16} color={color} />
              </XStack>
              <Text fontSize={14} fontWeight="500" color="$text" flex={1} marginLeft="$2">
                {label}
              </Text>
              <Switch
                value={recorder[key]}
                onValueChange={() => toggleRecorder(key)}
                trackColor={{ false: '$toggleOff' as any, true: '$accent' as any }}
                thumbColor="white"
              />
            </XStack>
          ))}
        </UICard>
      </YStack>

      {/* ── Recorder Inputs ───────────────────────── */}
      <YStack backgroundColor="$card" borderRadius="$6" marginBottom="$5" padding="$4">
        <XStack gap="$3">
          <YStack flex={1} gap="$1">
            <Text fontSize={11} fontWeight="600" color="$textSecondary">Segment Time (sec)</Text>
            <Input value={segmentTime} onChangeText={setSegmentTime} keyboardType="number-pad"
              backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
              height={40} fontSize={13} paddingHorizontal={12}
            />
          </YStack>
          <YStack flex={1} gap="$1">
            <Text fontSize={11} fontWeight="600" color="$textSecondary">Engine</Text>
            <XStack gap="$1">
              {['ffmpeg', 'hyper'].map((e) => (
                <YStack
                  key={e}
                  flex={1} paddingVertical={10} borderRadius="$5" alignItems="center"
                  backgroundColor={recordEngine === e ? '$accent' : '$inputBg'}
                  borderWidth={1} borderColor={recordEngine === e ? '$accent' : '$inputBorder'}
                  pressStyle={{ opacity: 0.8, scale: 0.97 }}
                  onPress={() => setRecordEngine(e)}
                >
                  <Text fontSize={11} fontWeight="600" color={recordEngine === e ? 'white' : '$textMuted'}>{e.toUpperCase()}</Text>
                </YStack>
              ))}
            </XStack>
          </YStack>
        </XStack>

        <YStack gap="$1" marginTop="$3">
          <Text fontSize={11} fontWeight="600" color="$textSecondary">Custom User-Agent</Text>
          <Input value={userAgent} onChangeText={setUserAgent} placeholder="Mozilla/5.0..."
            backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
            height={40} fontSize={13} paddingHorizontal={12} fontFamily="monospace"
          />
        </YStack>

        <YStack gap="$2" borderTopWidth={1} borderTopColor="$divider" paddingTop={12} marginTop="$3">
          <Text fontSize={10} fontWeight="600" color="$textMuted" letterSpacing={1}>CONCURRENCY</Text>
          <XStack gap="$3">
            {['maxLive', 'maxDownloads', 'maxUploads'].map((field) => (
              <YStack key={field} flex={1} gap="$1">
                <Text fontSize={10} color="$textSecondary">
                  {field === 'maxLive' ? 'Live Recordings' : field === 'maxDownloads' ? 'Downloads' : 'Uploads'}
                </Text>
                <Input
                  value={field === 'maxLive' ? maxLive : field === 'maxDownloads' ? maxDownloads : maxUploads}
                  onChangeText={field === 'maxLive' ? setMaxLive : field === 'maxDownloads' ? setMaxDownloads : setMaxUploads}
                  keyboardType="number-pad"
                  backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
                  height={40} fontSize={13} paddingHorizontal={12}
                />
              </YStack>
            ))}
          </XStack>
        </YStack>
      </YStack>

      {/* ── URL Resolver ─────────────────────────── */}
      <YStack marginBottom={12}>
        <UISectionHeader>URL Resolver Strategy</UISectionHeader>
        <UICard>
          <UICardTitle>URL Resolver Strategy</UICardTitle>
          <UICardDesc marginBottom={16}>Determine how the system cracks TikTok Live URLs.</UICardDesc>

          <Text fontSize={11} fontWeight="600" color="$textSecondary" marginBottom="$2">Primary Extractor Engine</Text>
          <XStack gap="$2">
            {[
              { value: 'unified', label: 'Unified Engine' },
              { value: 'ytdlp', label: 'YT-DLP Standard' },
            ].map((opt) => (
              <YStack
                key={opt.value}
                flex={1} paddingVertical={10} borderRadius="$5" alignItems="center"
                backgroundColor={resolverProvider === opt.value ? '$accent' : '$inputBg'}
                borderWidth={1} borderColor={resolverProvider === opt.value ? '$accent' : '$inputBorder'}
                pressStyle={{ opacity: 0.8, scale: 0.97 }}
                onPress={() => setResolverProvider(opt.value)}
              >
                <Text fontSize={11} fontWeight="600" color={resolverProvider === opt.value ? 'white' : '$textMuted'}>{opt.label}</Text>
              </YStack>
            ))}
          </XStack>

          <XStack gap="$3" marginTop="$3" flexWrap="wrap">
            <YStack flex={1} minWidth={140} backgroundColor="$infoLight" borderRadius="$5" padding={12} borderWidth={1} borderColor="#e0e7ff">
              <Text fontSize={13} fontWeight="600" color="#1e40af" marginBottom={4}>Unified Engine</Text>
              <Text fontSize={11} color="$textSecondary">5-layer scraper. Cycles through HTML, Webcast APIs, and Connectors.</Text>
            </YStack>
            <YStack flex={1} minWidth={140} backgroundColor="$inputBg" borderRadius="$5" padding={12} borderWidth={1} borderColor="$inputBorder">
              <Text fontSize={13} fontWeight="600" color="$text" marginBottom={4}>YT-DLP Standard</Text>
              <Text fontSize={11} color="$textSecondary">Bypasses stealth scrapers; routes directly to YT-DLP.</Text>
            </YStack>
          </XStack>
        </UICard>
      </YStack>

      {/* ── Save Button ──────────────────────────── */}
      <Button
        size="$5" height={48}
        backgroundColor="$accent" color="white" borderRadius="$6"
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        icon={saveMutation.isPending ? () => <Spinner color="white" /> : () => <Save size={18} color="white" />}
      >
        {saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
      </Button>
    </ScrollView>
  )
}
