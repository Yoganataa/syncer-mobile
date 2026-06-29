import { useState, useCallback, useRef, memo } from 'react'
import { RefreshControl, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, Spinner, useTheme } from 'tamagui'
import { Activity, Cpu, HardDrive, Monitor, AlertCircle, Settings, Shield, LogOut, Save, Key, Stethoscope } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useAuth } from '../AuthContext'
import log from '../logger'
import type { DashboardStats } from '../types'
import { ListSection, ListCell } from '../components/ui/ListCell'
import { UIPageTitle, UIPageSubtitle, UIMetricValue, UIMetricLabel, UICircleBtn } from '../components/ui/styled'
import SecurityScreen from './SecurityScreen'
import SettingsDetailScreen from './SettingsDetailScreen'
import SavedLinksScreen from './SavedLinksScreen'
import AuthToolsScreen from './AuthToolsScreen'
import DoctorScreen from './DoctorScreen'

export default function DashboardScreen() {
  const [screen, setScreen] = useState<string | null>(null)
  if (screen === 'Security') return <SecurityScreen onBack={() => setScreen(null)} />
  if (screen === 'Settings') return <SettingsDetailScreen onBack={() => setScreen(null)} />
  if (screen === 'SavedLinks') return <SavedLinksScreen onBack={() => setScreen(null)} />
  if (screen === 'AuthTools') return <AuthToolsScreen onBack={() => setScreen(null)} />
  if (screen === 'Doctor') return <DoctorScreen onBack={() => setScreen(null)} />
  return <DashboardContent onNavigate={setScreen} />
}

const QUICK_ACTIONS = [
  { key: 'SavedLinks', icon: Save, color: '#6366f1' },
  { key: 'AuthTools', icon: Key, color: '#8b5cf6' },
  { key: 'Doctor', icon: Stethoscope, color: '#059669' },
  { key: 'Security', icon: Shield, color: '#0891b2' },
  { key: 'Settings', icon: Settings, color: '#f59e0b' },
]

function DashboardContent({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { logout } = useAuth()
  const theme = useTheme()
  const refreshingRef = useRef(false)
  const queryClient = useQueryClient()
  const dashboardLog = log.extend('Dashboard')

  const prefetchScreen = useCallback((screen: string) => {
    const prefecthMap: Record<string, { queryKey: readonly string[]; url: string }> = {
      Security: { queryKey: queryKeys.security.summary, url: '/security/summary' },
      Settings: { queryKey: queryKeys.settings.all, url: '/settings' },
      SavedLinks: { queryKey: queryKeys.savedLinks.all, url: '/saved/' },
      AuthTools: { queryKey: queryKeys.auth.status, url: '/tools/auth/status' },
      Doctor: { queryKey: queryKeys.doctor.all, url: '/doctor' },
    }
    const target = prefecthMap[screen]
    if (target) {
      queryClient.prefetchQuery({
        queryKey: target.queryKey,
        queryFn: () => api.get(target.url),
        staleTime: 30_000,
      })
    }
  }, [queryClient])

  const handleNavigate = useCallback((screen: string) => {
    prefetchScreen(screen)
    onNavigate(screen)
  }, [prefetchScreen, onNavigate])

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const onRefresh = useCallback(async () => {
    refreshingRef.current = true
    await refetch()
    refreshingRef.current = false
  }, [refetch])

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  if (!stats) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center" padding="$4">
        <Text color="$textSecondary" fontSize={16}>Failed to load dashboard</Text>
      </YStack>
    )
  }

  const s = stats
  const sys = s.system
  const hasErrors = s.recent_errors.length > 0

  return (
    <ScrollView
      flex={1} backgroundColor="$bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshingRef.current} onRefresh={onRefresh} tintColor={theme.accent?.val} />}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$6">
        <YStack gap="$0.5">
          <UIPageTitle>Dashboard</UIPageTitle>
          <UIPageSubtitle>System overview</UIPageSubtitle>
        </YStack>
        <XStack gap="$2">
          {QUICK_ACTIONS.map((action) => (
            <UICircleBtn key={action.key} onPress={() => handleNavigate(action.key)}>
              <action.icon size={20} color={action.color} />
            </UICircleBtn>
          ))}
          <UICircleBtn color="danger" onPress={() => Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => {
              dashboardLog.info('logout initiated')
              logout()
            }},
          ])}>
            <LogOut size={20} color={theme.destructive?.val} />
          </UICircleBtn>
        </XStack>
      </XStack>

      {/* Bento metric tiles */}
      <XStack gap="$3" marginBottom="$3">
        <MetricTile label="Running Jobs" value={s.queue.running} color="$accent" size="large" />
        <MetricTile label="Queued" value={s.queue.queued} color="$warning" size="small" />
      </XStack>
      <XStack gap="$3" marginBottom="$5">
        <MetricTile label="Watchers" value={s.watch.live + s.watch.feed} color="$info" size="small" />
        <MetricTile label="Cooldowns" value={s.cooldowns.active} color="$destructive" size="large" />
      </XStack>

      {/* Pipeline lanes - bento */}
      <YStack backgroundColor="$card" borderRadius="$6" marginBottom="$5" padding="$4" gap="$3">
        <Text fontSize={16} fontWeight="600" color="$text">Pipeline</Text>
        <XStack gap="$3">
          <LaneCard label="Live" data={s.lanes.live} />
          <LaneCard label="Download" data={s.lanes.download} />
          <LaneCard label="Upload" data={s.lanes.upload} />
        </XStack>
      </YStack>

      {/* System info as grouped list */}
      <ListSection title="System">
        <ListCell icon={<Monitor size={16} color={theme.textMuted?.val} />} label="OS" right={sys.os} />
        <ListCell icon={<Cpu size={16} color={theme.textMuted?.val} />} label="CPU" right={`${sys.cpu.percent}% · ${sys.cpu.cores} cores`} />
        <ListCell icon={<Activity size={16} color={theme.textMuted?.val} />} label="RAM" right={`${sys.ram.system_percent}%`} subtitle={`${sys.ram.app_used} / ${sys.ram.system_total}`} />
        <ListCell icon={<HardDrive size={16} color={theme.textMuted?.val} />} label="Disk" right={`${sys.disk.percent}%`} subtitle={`${sys.disk.used} / ${sys.disk.total}`} />
        <ListCell icon={<Activity size={16} color={theme.textMuted?.val} />} label="Bot Uptime" right={sys.uptime.bot} last />
      </ListSection>

      {/* Recent Errors */}
      {hasErrors && (
        <ListSection title="Recent Errors">
          {s.recent_errors.slice(0, 3).map((err, i) => (
            <ListCell
              key={i}
              icon={<AlertCircle size={16} color={theme.destructive?.val} />}
              label={err.type}
              subtitle={err.error}
              right={err.user}
              last={i === Math.min(s.recent_errors.length, 3) - 1}
            />
          ))}
        </ListSection>
      )}

      <YStack height={40} />
    </ScrollView>
  )
}

const MetricTile = memo(function MetricTile({ label, value, color, size }: { label: string; value: number; color: string; size: 'large' | 'small' }) {
  return (
    <YStack
      backgroundColor="$card" borderRadius="$6" padding="$4"
      flex={size === 'large' ? 2 : 1}
      gap="$0.5"
      pressStyle={{ opacity: 0.8, scale: 0.97 }}
    >
      <UIMetricValue size={size} color={color}>{value}</UIMetricValue>
      <UIMetricLabel>{label}</UIMetricLabel>
    </YStack>
  )
})

const LaneCard = memo(function LaneCard({ label, data }: { label: string; data: { running: number; queued: number } }) {
  return (
    <YStack flex={1} backgroundColor="$bg" borderRadius="$5" padding="$3" alignItems="center" gap="$1" pressStyle={{ opacity: 0.8, scale: 0.97 }}>
      <Text fontSize={11} fontWeight="600" color="$textSecondary">{label}</Text>
      <XStack gap="$4" marginTop={4}>
        <YStack alignItems="center">
          <Text fontSize={20} fontWeight="700" color="$accent">{data.running}</Text>
          <Text fontSize={11} color="$textMuted">Run</Text>
        </YStack>
        <YStack alignItems="center">
          <Text fontSize={20} fontWeight="700" color="$warning">{data.queued}</Text>
          <Text fontSize={11} color="$textMuted">Queued</Text>
        </YStack>
      </XStack>
    </YStack>
  )
})
