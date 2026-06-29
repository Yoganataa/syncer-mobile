import { useState, useCallback, useRef, useEffect } from 'react'
import { ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { YStack, XStack, Text, Spinner, Input, useTheme, Button } from 'tamagui'
import { ChevronLeft, RefreshCw, Trash2, Shield, Activity, Globe, AlertTriangle, Clock, Search, Server } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { UICard, UICardTitle, UICardDesc } from '../components/ui/styled'
import { UIInfoRow, UIInfoLabel, UIInfoValue } from '../components/ui/styled'
import { UIPageTitle } from '../components/ui/styled'
import { queryKeys } from '../queryKeys'
import log from '../logger'

interface SecuritySummary {
  total_requests: number; requests_1h: number; requests_24h: number
  total_events: number; events_1h: number; events_24h: number
  unique_ips_24h: number
  top_ips: { ip: string; count: number }[]
  top_paths: { path: string; count: number }[]
  events_by_type: { type: string; count: number }[]
  status_distribution: { status: number; count: number }[]
}

interface RequestLog {
  _id: string; ts: string; ip: string; method: string; path: string
  query?: string; status: number; latency_ms: number; ua: string
}

interface SecurityEvent {
  _id: string; ts: string; type: string; ip: string; path: string
  ua: string; severity: string
}

type Tab = 'overview' | 'requests' | 'events' | 'audit'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'requests', label: 'Requests', icon: Globe },
  { key: 'events', label: 'Events', icon: AlertTriangle },
  { key: 'audit', label: 'Audit', icon: Server },
]

function getStatusColor(status: number) {
  if (status >= 500) return '#dc2626'
  if (status >= 400) return '#f59e0b'
  if (status >= 300) return '#6b7280'
  return '#00aa13'
}

function getEventSeverityColor(severity: string) {
  switch (severity) {
    case 'high': return '#dc2626'
    case 'medium': return '#f59e0b'
    default: return '#6b7280'
  }
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString() } catch { return ts }
}

function fmtDate(ts: string) {
  try { return new Date(ts).toLocaleString() } catch { return ts }
}

interface Props {
  onBack?: () => void
}

export default function SecurityScreen({ onBack }: Props) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [filterIP, setFilterIP] = useState('')
  const [filterPath, setFilterPath] = useState('')
  const [filterType, setFilterType] = useState('')
  const securityLog = log.extend('Security')

  const [debouncedIP, setDebouncedIP] = useState('')
  const [debouncedPath, setDebouncedPath] = useState('')
  const [debouncedType, setDebouncedType] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedIP(filterIP)
      setDebouncedPath(filterPath)
      setDebouncedType(filterType)
    }, 300)
    return () => clearTimeout(debounceTimer.current)
  }, [filterIP, filterPath, filterType])

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: queryKeys.security.summary,
    queryFn: () => api.get<SecuritySummary>('/security/summary'),
    staleTime: 30_000,
  })

  const { data: requests, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: queryKeys.security.requests(debouncedIP, debouncedPath),
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedIP) params.set('ip', debouncedIP)
      if (debouncedPath) params.set('path', debouncedPath)
      params.set('limit', '100')
      return api.get<RequestLog[]>(`/security/requests?${params}`)
    },
    staleTime: 15_000,
    enabled: tab === 'requests',
  })

  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: queryKeys.security.events(debouncedType, debouncedIP),
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedType) params.set('type', debouncedType)
      if (debouncedIP) params.set('ip', debouncedIP)
      params.set('limit', '100')
      return api.get<SecurityEvent[]>(`/security/events?${params}`)
    },
    staleTime: 15_000,
    enabled: tab === 'events',
  })

  const { data: auditLogs, isLoading: loadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: queryKeys.security.audit,
    queryFn: () => api.get<any[]>('/security/audit'),
    staleTime: 15_000,
    enabled: tab === 'audit',
  })

  const handleCleanup = () => {
    Alert.alert('Cleanup Logs', 'Delete logs older than 7 days?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.delete<{ deleted_requests: number; deleted_events: number }>('/security/cleanup?days=7')
            securityLog.info('cleanup done:', res)
            Alert.alert('Done', `Deleted ${res.deleted_requests} requests and ${res.deleted_events} events`)
            refetchSummary()
          } catch (e: unknown) {
            securityLog.error('cleanup failed:', (e as Error).message)
            Alert.alert('Error', 'Cleanup failed')
          }
        },
      },
    ])
  }

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchSummary(), refetchRequests(), refetchEvents(), refetchAudit()])
  }, [refetchSummary, refetchRequests, refetchEvents, refetchAudit])

  const renderSummary = () => (
    <YStack gap="$4">
      <XStack flexWrap="wrap" gap="$3">
        {summary && [
          { label: 'Requests (1h)', value: summary.requests_1h, color: '$accent' },
          { label: 'Requests (24h)', value: summary.requests_24h, color: '$warning' },
          { label: 'Events (1h)', value: summary.events_1h, color: '$destructive' },
          { label: 'Unique IPs', value: summary.unique_ips_24h, color: '$info' },
        ].map((card) => (
          <UICard key={card.label} padding="$3" flex={1} minWidth={140}>
            <Text fontSize={24} fontWeight="700" color={card.color as any}>{card.value}</Text>
            <UICardDesc marginTop="$1">{card.label}</UICardDesc>
          </UICard>
        ))}
      </XStack>

      <XStack gap="$3">
        <UICard flex={1} padding="$3">
          <UICardTitle marginBottom="$2">Top IPs (24h)</UICardTitle>
          {summary?.top_ips.slice(0, 5).map((ip) => (
            <UIInfoRow key={ip.ip} paddingVertical="$1.5">
              <TouchableOpacity onPress={() => { setFilterIP(ip.ip); setTab('requests') }}>
                <Text color="$accent" fontSize={13} fontFamily="monospace">{ip.ip}</Text>
              </TouchableOpacity>
              <Text color="$textMuted" fontSize={13}>{ip.count}</Text>
            </UIInfoRow>
          ))}
        </UICard>

        <UICard flex={1} padding="$3">
          <UICardTitle marginBottom="$2">Events by Type</UICardTitle>
          {summary?.events_by_type.slice(0, 5).map((e) => (
            <UIInfoRow key={e.type} paddingVertical="$1.5">
              <Text color="$text" fontSize={13}>{e.type}</Text>
              <Text color="$textMuted" fontSize={13}>{e.count}</Text>
            </UIInfoRow>
          ))}
        </UICard>
      </XStack>

      <XStack gap="$3">
        <UICard flex={1} padding="$3">
          <UICardTitle marginBottom="$2">Top Paths (24h)</UICardTitle>
          {summary?.top_paths.slice(0, 5).map((p) => (
            <UIInfoRow key={p.path} paddingVertical="$1.5">
              <Text color="$text" fontSize={13} flex={1} numberOfLines={1}>{p.path}</Text>
              <Text color="$textMuted" fontSize={13}>{p.count}</Text>
            </UIInfoRow>
          ))}
        </UICard>

        <UICard flex={1} padding="$3">
          <UICardTitle marginBottom="$2">Status Codes</UICardTitle>
          {summary?.status_distribution.slice(0, 5).map((s) => (
            <UIInfoRow key={s.status} paddingVertical="$1.5">
              <Text color={getStatusColor(s.status) as any} fontSize={13} fontWeight="600">{s.status}</Text>
              <Text color="$textMuted" fontSize={13}>{s.count}</Text>
            </UIInfoRow>
          ))}
        </UICard>
      </XStack>
    </YStack>
  )

  const renderRequests = () => (
    <YStack gap="$3">
      <XStack gap="$2">
        <Input
          flex={1} placeholder="Filter IP..." value={filterIP} onChangeText={setFilterIP}
          backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text"
          borderRadius="$5" height={36} fontSize={13} paddingHorizontal={10} fontFamily="monospace"
        />
        <Input
          flex={1} placeholder="Filter path..." value={filterPath} onChangeText={setFilterPath}
          backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text"
          borderRadius="$5" height={36} fontSize={13} paddingHorizontal={10} fontFamily="monospace"
        />
        <Button
          size="$3" backgroundColor="$accent" color="white" borderRadius="$5"
          onPress={() => refetchRequests()} disabled={loadingRequests}
        >
          <Search size={14} color="white" />
        </Button>
      </XStack>

      {loadingRequests ? (
        <YStack padding="$8" alignItems="center"><Spinner color="$accent" /></YStack>
      ) : !requests?.length ? (
        <Text color="$textMuted" fontSize={14} textAlign="center" padding="$8">No requests found</Text>
      ) : (
        <YStack gap="$1.5">
          {requests.map((req) => (
            <UICard key={req._id} padding="$3">
              <XStack gap="$2" alignItems="flex-start">
                <YStack width={6} height={6} borderRadius={3} backgroundColor={getStatusColor(req.status)} marginTop={6} />
                <YStack flex={1} gap="$1">
                  <XStack gap="$2" alignItems="center" flexWrap="wrap">
                    <XStack
                      backgroundColor={req.method === 'POST' ? '#fef3c7' : req.method === 'DELETE' ? '#fef2f2' : '#f3f4f6'}
                      paddingHorizontal={6} paddingVertical={2} borderRadius={4}
                    >
                      <Text fontSize={10} fontWeight="700" color={
                        req.method === 'POST' ? '#f59e0b' : req.method === 'DELETE' ? '#dc2626' : '#6b7280'
                      }>{req.method}</Text>
                    </XStack>
                    <Text fontSize={13} fontWeight="600" color={getStatusColor(req.status) as any}>{req.status}</Text>
                    <Text fontSize={11} color="$textMuted">{req.latency_ms}ms</Text>
                    <Text fontSize={11} color="$textMuted">{fmtTime(req.ts)}</Text>
                  </XStack>
                  <Text fontSize={13} color="$text" fontFamily="monospace" numberOfLines={1}>{req.path}</Text>
                  <XStack gap="$3">
                    <Text fontSize={11} color="$textMuted" fontFamily="monospace">{req.ip}</Text>
                    <Text fontSize={11} color="$textMuted" numberOfLines={1} flex={1}>{req.ua}</Text>
                  </XStack>
                </YStack>
              </XStack>
            </UICard>
          ))}
        </YStack>
      )}
    </YStack>
  )

  const renderEvents = () => (
    <YStack gap="$3">
      <XStack gap="$2">
        <XStack
          flex={1} backgroundColor="$inputBg" borderRadius="$5" borderWidth={1} borderColor="$inputBorder"
          paddingHorizontal={10} height={36} alignItems="center"
        >
          {['', 'bot_detected', 'suspicious_path', 'rate_limit', 'no_user_agent'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setFilterType(t)}
              style={{
                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                backgroundColor: filterType === t ? (theme.accent?.val || '#00aa13') : 'transparent',
                marginRight: 4,
              }}
            >
              <Text
                fontSize={10} fontWeight="600"
                color={filterType === t ? 'white' : (theme.textMuted?.val || '#999')}
              >
                {t ? t.replace('_', ' ') : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </XStack>
        <Input
          flex={1} placeholder="Filter IP..." value={filterIP} onChangeText={setFilterIP}
          backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text"
          borderRadius="$5" height={36} fontSize={13} paddingHorizontal={10} fontFamily="monospace"
        />
        <Button
          size="$3" backgroundColor="$accent" color="white" borderRadius="$5"
          onPress={() => refetchEvents()} disabled={loadingEvents}
        >
          <Search size={14} color="white" />
        </Button>
      </XStack>

      {loadingEvents ? (
        <YStack padding="$8" alignItems="center"><Spinner color="$accent" /></YStack>
      ) : !events?.length ? (
        <Text color="$textMuted" fontSize={14} textAlign="center" padding="$8">No events found</Text>
      ) : (
        <YStack gap="$1.5">
          {events.map((evt) => (
            <UICard key={evt._id} padding="$3"
              borderLeftWidth={3}
              borderLeftColor={getEventSeverityColor(evt.severity) === '#dc2626' ? '$destructive' : getEventSeverityColor(evt.severity) === '#f59e0b' ? '$warning' : '$textMuted' as any}
            >
              <XStack gap="$2" alignItems="flex-start">
                <YStack flex={1} gap="$1">
                  <XStack gap="$2" alignItems="center" flexWrap="wrap">
                    <XStack
                      backgroundColor={evt.type === 'suspicious_path' || evt.type === 'bot_detected' ? '#fef2f2' : '#fef3c7'}
                      paddingHorizontal={6} paddingVertical={2} borderRadius={4}
                    >
                      <Text fontSize={10} fontWeight="700" color={
                        evt.type === 'suspicious_path' || evt.type === 'bot_detected' ? '#dc2626' : '#f59e0b'
                      }>
                        {evt.type.replace(/_/g, ' ')}
                      </Text>
                    </XStack>
                    <XStack
                      backgroundColor={evt.severity === 'high' ? '#fef2f2' : evt.severity === 'medium' ? '#fef3c7' : '#f3f4f6'}
                      paddingHorizontal={6} paddingVertical={2} borderRadius={4}
                    >
                      <Text fontSize={10} fontWeight="600" color={
                        evt.severity === 'high' ? '#dc2626' : evt.severity === 'medium' ? '#f59e0b' : '#6b7280'
                      }>{evt.severity}</Text>
                    </XStack>
                    <Text fontSize={11} color="$textMuted">{fmtTime(evt.ts)}</Text>
                  </XStack>
                  <Text fontSize={13} color="$text" fontFamily="monospace" numberOfLines={1}>{evt.path}</Text>
                  <XStack gap="$3">
                    <Text fontSize={11} color="$textMuted" fontFamily="monospace">{evt.ip}</Text>
                    <Text fontSize={11} color="$textMuted" numberOfLines={1} flex={1}>{evt.ua}</Text>
                  </XStack>
                </YStack>
              </XStack>
            </UICard>
          ))}
        </YStack>
      )}
    </YStack>
  )

  const renderAudit = () => (
    <YStack>
      {loadingAudit ? (
        <YStack padding="$8" alignItems="center"><Spinner color="$accent" /></YStack>
      ) : !auditLogs?.length ? (
        <Text color="$textMuted" fontSize={14} textAlign="center" padding="$8">No audit events recorded</Text>
      ) : (
        <UICard padding="$3" backgroundColor="$bg">
          <YStack gap="$2" maxHeight={500}>
            <ScrollView>
              {auditLogs.map((log: any, i: number) => (
                <XStack key={log._id || i} gap="$2" paddingVertical="$1.5" borderBottomWidth={1} borderBottomColor="$divider">
                  <Text fontSize={11} color="$textMuted" fontFamily="monospace" width={70}>
                    [{fmtTime(log.ts)}]
                  </Text>
                  <Text fontSize={11} color="$accent" fontWeight="600" fontFamily="monospace" width={120} numberOfLines={1}>
                    {log.action || 'SYS_EVENT'}
                  </Text>
                  <Text fontSize={11} color="$text" fontFamily="monospace" flex={1} numberOfLines={2}>
                    {log.details || log.msg || ''}
                  </Text>
                </XStack>
              ))}
            </ScrollView>
          </YStack>
        </UICard>
      )}
    </YStack>
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg!.val }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={theme.accent?.val || '#00aa13'} />}
    >
      <XStack alignItems="center" gap="$3" marginBottom="$5" marginTop="$2">
        {onBack && (
          <TouchableOpacity onPress={onBack}>
            <YStack width={40} height={40} borderRadius={20} backgroundColor="$cardBorder" justifyContent="center" alignItems="center" pressStyle={{ opacity: 0.8, scale: 0.92 }}>
              <ChevronLeft size={22} color={theme.text?.val} />
            </YStack>
          </TouchableOpacity>
        )}
        <UIPageTitle>Security</UIPageTitle>
        <YStack flex={1} />
        <TouchableOpacity onPress={handleCleanup}>
          <YStack width={36} height={36} borderRadius={18} backgroundColor="#fef2f2" justifyContent="center" alignItems="center">
            <Trash2 size={16} color={theme.destructive?.val} />
          </YStack>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh}>
          <YStack width={36} height={36} borderRadius={18} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
            <RefreshCw size={16} color={theme.text?.val} />
          </YStack>
        </TouchableOpacity>
      </XStack>

      <XStack gap="$1" marginBottom="$4" flexWrap="wrap">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1 }}>
              <YStack
                paddingVertical={10} borderRadius="$5" alignItems="center"
                backgroundColor={active ? (theme.accent?.val || '#00aa13') : '$card'}
                borderWidth={1} borderColor={active ? '$accent' : '$cardBorder'}
                flexDirection="row" justifyContent="center" gap="$1.5"
                marginBottom="$1"
              >
                <t.icon size={14} color={active ? 'white' : (theme.textMuted?.val || '#999')} />
                <Text
                  fontSize={11} fontWeight="600"
                  color={active ? 'white' : (theme.textMuted?.val || '#999')}
                >{t.label}</Text>
              </YStack>
            </TouchableOpacity>
          )
        })}
      </XStack>

      {loadingSummary && tab === 'overview' ? (
        <YStack padding="$8" alignItems="center"><Spinner size="large" color="$accent" /></YStack>
      ) : tab === 'overview' ? renderSummary() : tab === 'requests' ? renderRequests() : tab === 'events' ? renderEvents() : renderAudit()}
    </ScrollView>
  )
}
