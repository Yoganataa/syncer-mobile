import { useState } from 'react'
import { ScrollView } from 'react-native'
import { YStack, XStack, Text, Spinner, Button, Input, TextArea, useTheme } from 'tamagui'
import { ChevronLeft, Cookie, RefreshCw, Globe, Clock, FileKey, Upload, AlertTriangle, Download, CheckCircle, Trash2 } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import { ListSection, ListCell } from '../components/ui/ListCell'
import { StatusBadge } from '../components/ui/StatusBadge'
import { UICard, UICardTitle, UICardDesc, UICircleBtn, UISectionHeader, UIActionBtn, UIActionBtnText, UIInfoRow, UIInfoLabel, UIInfoValue } from '../components/ui/styled'

interface Props {
  onBack?: () => void
}

interface CookieProfile {
  profile: string
  domain: string
  kind: string
  status: string
  status_detail?: string
  validated_at?: string
  updated_at?: string
}

export default function AuthToolsScreen({ onBack }: Props) {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const [cookiesText, setCookiesText] = useState('')
  const [profileName, setProfileName] = useState('')
  const [cleaning, setCleaning] = useState<string | null>(null)
  const [cleanupResult, setCleanupResult] = useState<{ status: string; message: string } | null>(null)
  const authLog = log.extend('AuthTools')

  const CLEANUP_ACTIONS = [
    { key: 'expired_fallbacks', label: 'Expired Fallbacks', desc: 'Remove old fallback link entries', icon: AlertTriangle, color: theme.warning?.val },
    { key: 'empty_tmp', label: 'Empty Temp Dirs', desc: 'Remove empty temporary directories', icon: Download, color: '#2563eb' } as const,
    { key: 'failed_jobs', label: 'Failed Jobs', desc: 'Delete failed/cancelled job records', icon: Trash2, color: theme.destructive?.val },
  ]

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.auth.status,
    queryFn: () => api.get<CookieProfile[]>('/tools/auth/status'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const importMutation = useMutation({
    mutationFn: (body: { text: string; profile_name?: string }) => api.post('/tools/auth/upload', body),
    onSuccess: () => {
      authLog.info('cookies imported')
      show('Cookies imported successfully', 'success')
      setCookiesText('')
      setProfileName('')
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.status })
    },
    onError: (e: unknown) => {
      authLog.error('import cookies failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Import failed', 'error')
    },
  })

  const validateMutation = useMutation({
    mutationFn: () => api.post<any>('/tools/auth/validate', { profile: null }),
    onSuccess: (res) => {
      const updated = profiles.map((p) => {
        const result = res.results?.find((r: any) => r.profile === p.profile)
        return result ? { ...p, status: result.status, status_detail: result.detail, validated_at: result.validated_at } : p
      })
      queryClient.setQueryData(queryKeys.auth.status, updated)
      authLog.info('validation complete')
      show('Validation complete', 'success')
    },
    onError: (e: unknown) => {
      authLog.error('validate failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Validation failed', 'error')
    },
  })

  const handleCleanup = async (target: string) => {
    setCleaning(target)
    setCleanupResult(null)
    try {
      const res = await api.post<any>(`/tools/cleanup/${target}`)
      authLog.info(`cleanup ${target} done:`, res.message)
      setCleanupResult({ status: 'success', message: res.message || `Cleanup ${target} done` })
    } catch (e: unknown) {
      authLog.error(`cleanup ${target} failed:`, (e as Error).message)
      setCleanupResult({ status: 'error', message: e instanceof Error ? e.message : 'Cleanup failed' })
    } finally {
      setCleaning(null)
    }
  }

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg?.val }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <XStack alignItems="center" gap="$3" marginBottom="$6">
        {onBack && (
          <UICircleBtn onPress={onBack}>
            <ChevronLeft size={22} color={theme.text?.val} />
          </UICircleBtn>
        )}
        <Text fontSize={22} fontWeight="700" color="$text">Auth Tools</Text>
      </XStack>

      {/* System Cleanup */}
      <ListSection title="System Cleanup">
        {CLEANUP_ACTIONS.map((action, i) => (
          <YStack
            key={action.key}
            onPress={() => handleCleanup(action.key)}
            opacity={cleaning === action.key ? 0.5 : 1}
            pressStyle={{ opacity: 0.85, scale: 0.97 }}
          >
            <ListCell
              icon={<action.icon size={16} color={action.color} />}
              label={action.label}
              subtitle={action.desc}
              right={cleaning === action.key ? <Spinner size="small" color="$textMuted" /> : undefined}
              last={i === CLEANUP_ACTIONS.length - 1}
            />
          </YStack>
        ))}
      </ListSection>

      {cleanupResult && (
        <YStack
          marginBottom="$5" padding="$3" borderRadius="$5"
          backgroundColor={cleanupResult.status === 'success' ? '$accentLight' : '$destructiveLight'}
          marginHorizontal="$4"
        >
          <XStack gap="$2" alignItems="center">
            {cleanupResult.status === 'success' ? (
              <CheckCircle size={14} color={theme.accent?.val} />
            ) : (
              <AlertTriangle size={14} color={theme.destructive?.val} />
            )}
            <Text fontSize={12} color={cleanupResult.status === 'success' ? '$accent' : '$destructive'}>
              {cleanupResult.message}
            </Text>
          </XStack>
        </YStack>
      )}

      {/* Import Cookies */}
      <UICard marginBottom="$6" gap="$3">
        <UICardTitle>Import Cookies</UICardTitle>
        <UICardDesc>Paste Netscape cookies.txt or raw cookie headers for TikTok, yt-dlp, etc.</UICardDesc>
        <Input
          placeholder="Profile name (optional)"
          value={profileName} onChangeText={setProfileName}
          height={44}
          backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
          paddingHorizontal="$4" fontSize={14}
        />
        <TextArea
          placeholder="Paste Netscape cookies.txt or raw Cookie headers here..."
          value={cookiesText}
          onChangeText={(v) => {
            setCookiesText(v)
            if (!profileName) {
              const match = v.match(/#\s*(?:Netscape HTTP Cookie File)?\s*(?:for\s+)?([\w.-]+)/i)
              if (match) setProfileName(match[1].replace(/^\./, '').split('.')[0])
            }
          }}
          minHeight={120}
          backgroundColor="$inputBg" borderWidth={1} borderColor="$inputBorder" color="$text" borderRadius="$5"
          paddingHorizontal="$4" paddingVertical="$3" fontSize={12}
          fontFamily="monospace"
        />
        <Button
          size="$4" height={44}
          backgroundColor="$accent" color="white" borderRadius="$5"
          onPress={() => { if (!cookiesText.trim()) return; importMutation.mutate({ text: cookiesText, profile_name: profileName || undefined }) }}
          disabled={importMutation.isPending || !cookiesText.trim()}
          icon={importMutation.isPending ? () => <Spinner color="white" /> : () => <Upload size={16} color="white" />}
        >
          Import Cookies
        </Button>
      </UICard>

      {/* Cookie Profiles */}
      <ListSection title="Cookie Profiles">
        {profiles.length === 0 ? (
          <ListCell label="No auth profiles configured" subtitle="Import cookies above to get started" last />
        ) : (
          profiles.map((item, i) => {
            const domain = item.domain || 'unknown'
            return (
              <ListCell
                key={item.profile}
                icon={<Cookie size={16} color={theme.info?.val} />}
                label={item.profile}
                subtitle={`${domain} · ${item.kind || 'auth'}`}
                right={<StatusBadge status={item.status} />}
                last={i === profiles.length - 1}
              />
            )
          })
        )}
      </ListSection>

      {/* Validate All */}
      <Button
        size="$4" height={44} marginTop="$2"
        backgroundColor="$infoLight" color="$info" borderRadius="$5"
        borderWidth={1} borderColor="$infoLight"
        onPress={() => validateMutation.mutate()}
        disabled={validateMutation.isPending || profiles.length === 0}
        icon={validateMutation.isPending ? () => <Spinner color="$info" /> : () => <RefreshCw size={16} color={theme.info?.val} />}
      >
        {validateMutation.isPending ? 'Validating...' : 'Validate All Profiles'}
      </Button>
    </ScrollView>
  )
}
