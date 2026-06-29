import { useState, useEffect, useRef } from 'react'
import { YStack, XStack, Text, Spinner, ScrollView, useTheme } from 'tamagui'
import { ChevronLeft, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity, Cpu, HardDrive, Terminal } from 'lucide-react-native'
import { api } from '../api'
import { useToast } from '../components/Toast'
import log from '../logger'
import { ListSection, ListCell } from '../components/ui/ListCell'
import { UICard, UICardTitle, UICardDesc, UICircleBtn, UISectionHeader, UIActionBtn, UIActionBtnText } from '../components/ui/styled'

interface Props {
  onBack?: () => void
}

interface DoctorResult {
  verdict: string
  summary: { ok: number; warn: number; fail: number }
  system: { version?: string; runtime?: string; python?: string; pid?: number; platform?: string }
  categories: Record<string, DoctorCheck[]>
}

interface DoctorCheck {
  title: string
  status: 'OK' | 'WARN' | 'FAIL'
  message?: string
  detail?: string
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  system: { label: 'System Health', color: '#6366f1' },
  network: { label: 'Network', color: '#2563eb' },
  storage: { label: 'Storage', color: '#f59e0b' },
  auth: { label: 'Authentication', color: '#8b5cf6' },
  media: { label: 'Media Processing', color: '#00aa13' },
  telegram: { label: 'Telegram', color: '#0891b2' },
  creators: { label: 'Creators', color: '#dc2626' },
  relays: { label: 'Relays', color: '#059669' },
}

const CATEGORY_ORDER = ['system', 'network', 'storage', 'auth', 'media', 'telegram', 'creators', 'relays']
const STAGES = [
  'Checking system health...', 'Analyzing storage...',
  'Validating network...', 'Reviewing authentication...',
  'Inspecting media pipeline...', 'Verifying Telegram...',
  'Scanning creators...', 'Checking relays...',
  'Compiling report...',
]

export default function DoctorScreen({ onBack }: Props) {
  const theme = useTheme()
  const { show } = useToast()
  const [result, setResult] = useState<DoctorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const doctorLog = log.extend('Doctor')

  const runDoctor = async () => {
    setLoading(true)
    setResult(null)
    setProgress(0)
    setStage('Initializing diagnostics...')

    let p = 0
    progressRef.current = setInterval(() => {
      p = Math.min(p + 2, 90)
      setProgress(p)
      const idx = Math.floor((p / 90) * STAGES.length)
      setStage(STAGES[Math.min(idx, STAGES.length - 1)])
    }, 150)

    try {
      const res = await api.post<DoctorResult>('/tools/doctor')
      if (mountedRef.current) {
        setProgress(100)
        setStage('Complete')
        setResult(res)
        doctorLog.info('doctor completed:', res.verdict, res.summary)
      }
    } catch (e: unknown) {
      setStage('Failed to run diagnostics')
      doctorLog.error('doctor failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Doctor failed', 'error')
    } finally {
      if (progressRef.current) clearInterval(progressRef.current)
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    runDoctor()
    return () => { mountedRef.current = false; if (progressRef.current) clearInterval(progressRef.current) }
  }, [])

  const verdictReady = result?.verdict === 'READY'
  const verdictTextColor = verdictReady ? '$accent' : '$destructive'
  const verdictIconColor = verdictReady ? (theme.accent?.val || '#00aa13') : (theme.destructive?.val || '#dc2626')
  const StatusIcon = verdictReady ? CheckCircle2 : XCircle

  return (
    <ScrollView
      backgroundColor="$bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 }}
    >
      <XStack alignItems="center" gap="$3" marginBottom="$6">
        {onBack && (
          <UICircleBtn onPress={onBack}>
            <ChevronLeft size={22} color={theme.text?.val} />
          </UICircleBtn>
        )}
        <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading">System Doctor</Text>
      </XStack>

      {/* Progress banner */}
      {loading && (
        <YStack backgroundColor="$card" borderRadius="$6" marginBottom="$5" padding="$4" gap="$3"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="600" color="$text">Running Diagnostics</Text>
            <Text fontSize={12} color="$accent">{progress}%</Text>
          </XStack>
          <XStack height={6} backgroundColor="$divider" borderRadius={3} overflow="hidden">
            <XStack width={`${progress}%` as any} backgroundColor="$accent" borderRadius={3} />
          </XStack>
          <Text fontSize={12} color="$textSecondary">{stage}</Text>
        </YStack>
      )}

      {/* Verdict banner */}
      {result && (
        <UICard backgroundColor={verdictReady ? '$accentLight' : '$destructiveLight'} marginBottom="$5" gap="$2">
          <XStack gap="$2" alignItems="center">
            {StatusIcon({ size: 20, color: verdictIconColor })}
            <UICardTitle color={verdictTextColor}>
              {verdictReady ? 'System Ready' : 'Issues Detected'}
            </UICardTitle>
          </XStack>
          <UICardDesc>
            {result.summary.ok} passed · {result.summary.warn} warnings · {result.summary.fail} failed
          </UICardDesc>
        </UICard>
      )}

      {/* System info */}
      {result?.system && (
        <ListSection title="System">
          {result.system.version && <ListCell icon={<Terminal size={16} color={theme.textMuted?.val} />} label="Version" right={result.system.version} />}
          {result.system.runtime && <ListCell icon={<Activity size={16} color={theme.textMuted?.val} />} label="Runtime" right={result.system.runtime} />}
          {result.system.python && <ListCell icon={<Cpu size={16} color={theme.textMuted?.val} />} label="Python" right={result.system.python} />}
          {result.system.platform && <ListCell icon={<HardDrive size={16} color={theme.textMuted?.val} />} label="Platform" right={result.system.platform} />}
          {result.system.pid != null && <ListCell icon={<Activity size={16} color={theme.textMuted?.val} />} label="PID" right={String(result.system.pid)} last />}
        </ListSection>
      )}

      {/* Category checks */}
      {result && CATEGORY_ORDER.map((key) => {
        const checks = result.categories?.[key]
        if (!checks?.length) return null
        const failCount = checks.filter((c) => c.status === 'FAIL').length
        const warnCount = checks.filter((c) => c.status === 'WARN').length
        const meta = CATEGORY_META[key]

        return (
          <ListSection key={key} title={meta?.label || key}>
            {checks.map((check, i) => {
              const statusIcon = check.status === 'OK' ? CheckCircle2 : check.status === 'WARN' ? AlertTriangle : XCircle
              const statusColor = check.status === 'OK' ? (theme.accent?.val || '#00aa13') : check.status === 'WARN' ? (theme.warning?.val || '#f59e0b') : (theme.destructive?.val || '#dc2626')
              return (
                <ListCell
                  key={check.title}
                  icon={statusIcon({ size: 16, color: statusColor })}
                  label={check.title}
                  subtitle={check.message}
                  right={check.status}
                  last={i === checks.length - 1}
                />
              )
            })}
          </ListSection>
        )
      })}

      {/* Re-run */}
      {result && (
        <XStack
          onPress={loading ? undefined : runDoctor}
          opacity={loading ? 0.5 : 1}
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingVertical={14}
          borderRadius="$5"
          backgroundColor="$info"
          marginTop="$4"
          pressStyle={{ opacity: 0.85, scale: 0.97 }}
        >
          {loading ? <Spinner color="white" /> : <RefreshCw size={16} color="white" />}
          <Text fontSize={14} fontWeight="600" color="white">
            Re-run Diagnostics
          </Text>
        </XStack>
      )}
    </ScrollView>
  )
}
