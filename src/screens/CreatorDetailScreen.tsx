import { useState, useCallback } from 'react'
import { Alert, TouchableOpacity } from 'react-native'
import { YStack, XStack, Text, Button, Spinner, ScrollView, Separator, useTheme } from 'tamagui'
import { ChevronLeft, User, Trash2, Scan } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import { useToast } from '../components/Toast'
import log from '../logger'
import type { Creator, Job } from '../types'
import { UICard, UICardTitle } from '../components/ui/styled'
import { Toggle } from '../components/ui/Toggle'
import { StatBox } from '../components/ui/StatBox'
import { UIInfoRow, UIInfoLabel, UIInfoValue } from '../components/ui/styled'

interface Props {
  username: string
  onBack: () => void
}

export default function CreatorDetailScreen({ username, onBack }: Props) {
  const theme = useTheme()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const detailLog = log.extend('CreatorDetail')

  const { data: creator, isLoading } = useQuery({
    queryKey: queryKeys.creators.detail(username),
    queryFn: () => api.get<Creator>(`/creators/${username}`),
    staleTime: 60_000,
  })

  const { data: jobs = [] } = useQuery({
    queryKey: queryKeys.creators.jobs(username),
    queryFn: async () => {
      const allJobs = await api.get<Job[]>('/jobs/')
      return allJobs.filter((j: Job) => j.username === username)
    },
    staleTime: 45_000,
    refetchInterval: 45_000,
    enabled: !!creator,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: boolean }) =>
      api.put(`/creators/${username}`, { [field]: value }),
    onMutate: async ({ field, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.creators.detail(username) })
      const prev = queryClient.getQueryData<Creator>(queryKeys.creators.detail(username))
      queryClient.setQueryData<Creator>(queryKeys.creators.detail(username), (old) =>
        old ? { ...old, [field]: value } : old,
      )
      return { prev }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKeys.creators.detail(username), context?.prev)
      detailLog.error(`toggle failed for @${username}`)
      show('Update failed', 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    },
  })

  const scanMutation = useMutation({
    mutationFn: () => api.post<{ status: string }>(`/creators/${username}/scan`),
    onSuccess: () => {
      detailLog.info('scan started')
      show('Scan started', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.detail(username) })
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
    },
    onError: (e: unknown) => {
      detailLog.error('scan failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Scan failed', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/creators/${username}`),
    onSuccess: () => {
      detailLog.info('creator deleted')
      show('Creator deleted', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all })
      onBack()
    },
    onError: (e: unknown) => {
      detailLog.error('delete failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Delete failed', 'error')
    },
  })

  const handleDelete = () => {
    Alert.alert('Delete Creator', `Remove @${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  if (!creator) {
    return (
      <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center" padding="$4">
        <Text color="$textSecondary" fontSize={16}>Creator not found</Text>
        <Button marginTop="$4" onPress={onBack}>Back</Button>
      </YStack>
    )
  }

  const lastScan = creator.last_scan?.scanned_at
    ? new Date(creator.last_scan.scanned_at).toLocaleString()
    : null

  return (
    <ScrollView flex={1} backgroundColor="$bg" padding="$4">
      <XStack alignItems="center" gap="$3" marginBottom="$4" marginTop="$2">
        <TouchableOpacity onPress={onBack}>
          <YStack width={40} height={40} borderRadius={20} backgroundColor="$cardBorder" justifyContent="center" alignItems="center" pressStyle={{ opacity: 0.8, scale: 0.92 }}>
            <ChevronLeft size={22} color={theme.text?.val} />
          </YStack>
        </TouchableOpacity>
        <Text fontSize={24} fontWeight="700" color="$text" flex={1} numberOfLines={1}>
          @{creator.username}
        </Text>
      </XStack>

      <UICard marginBottom="$4">
        <XStack gap="$4" alignItems="center" marginBottom="$4">
          {creator.avatar_url ? (
            <Image
              source={{ uri: creator.avatar_url }}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '$bg' as any }}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
          ) : (
            <XStack width={56} height={56} borderRadius={28} backgroundColor="$cardBorder" justifyContent="center" alignItems="center">
              <User size={24} color={theme.textMuted?.val} />
            </XStack>
          )}
          <YStack flex={1} gap="$1">
            <Text fontSize={20} fontWeight="700" color="$text">
              {creator.display_name || creator.username}
            </Text>
            <Text color="$textSecondary" fontSize={14}>@{creator.username}</Text>
          </YStack>
        </XStack>
        <YStack gap="$3">
          <UIInfoRow>
            <UIInfoLabel>Live Status</UIInfoLabel>
            <UIInfoValue>{creator.live_status}</UIInfoValue>
          </UIInfoRow>
          <Separator borderColor="$divider" />
          <UIInfoRow>
            <UIInfoLabel>Active</UIInfoLabel>
            <UIInfoValue>{creator.is_active ? 'Yes' : 'No'}</UIInfoValue>
          </UIInfoRow>
          {lastScan && (
            <>
              <Separator borderColor="$divider" />
              <UIInfoRow>
                <UIInfoLabel>Last Scan</UIInfoLabel>
                <UIInfoValue>{lastScan}</UIInfoValue>
              </UIInfoRow>
            </>
          )}
        </YStack>
      </UICard>

      <Text fontSize={18} fontWeight="600" color="$text" marginBottom="$3">Modules</Text>
      <UICard marginBottom="$4">
        <YStack gap="$3">
          <ModuleRow label="Live Tracking" active={creator.live_enabled} field="live_enabled" onToggle={(f, v) => toggleMutation.mutate({ field: f, value: v })} />
          <Separator borderColor="$divider" />
          <ModuleRow label="Feed Tracking" active={creator.feed_enabled} field="feed_enabled" onToggle={(f, v) => toggleMutation.mutate({ field: f, value: v })} />
          <Separator borderColor="$divider" />
          <ModuleRow label="Auto Record" active={creator.record_enabled} field="record_enabled" onToggle={(f, v) => toggleMutation.mutate({ field: f, value: v })} />
          <Separator borderColor="$divider" />
          <ModuleRow label="Notifications" active={creator.notify_enabled} field="notify_enabled" onToggle={(f, v) => toggleMutation.mutate({ field: f, value: v })} />
          <Separator borderColor="$divider" />
          <ModuleRow label="Bulk Download" active={creator.bulk_enabled} field="bulk_enabled" onToggle={(f, v) => toggleMutation.mutate({ field: f, value: v })} />
        </YStack>
      </UICard>

      {creator.stats && (
        <>
          <Text fontSize={18} fontWeight="600" color="$text" marginBottom="$3">Downloads (MTD)</Text>
          <XStack gap="$3" marginBottom="$4">
            <StatBox label="Feed" value={creator.stats.feed_downloads} />
            <StatBox label="Bulk" value={creator.stats.bulk_downloads} />
            <StatBox label="Total" value={creator.stats.total_downloads} highlight />
          </XStack>
        </>
      )}

      <XStack gap="$3" marginBottom="$4">
        <Button
          flex={1} size="$4" backgroundColor="$accent" color="white" borderRadius="$5"
          onPress={() => scanMutation.mutate()} disabled={scanMutation.isPending}
          icon={scanMutation.isPending ? () => <Spinner /> : () => <Scan size={18} color="white" />}
        >
          Scan Now
        </Button>
        <Button
          flex={1} size="$4" backgroundColor="$destructiveLight" color="$destructive" borderRadius="$5" borderWidth={0}
          onPress={handleDelete} disabled={deleteMutation.isPending}
          icon={() => <Trash2 size={18} color={theme.destructive?.val} />}
        >
          Delete
        </Button>
      </XStack>

      <Text fontSize={18} fontWeight="600" color="$text" marginBottom="$3">
        Jobs ({jobs.length})
      </Text>
      {jobs.length === 0 ? (
        <Text color="$textMuted" fontSize={14} textAlign="center" marginTop="$4">No jobs for this creator</Text>
      ) : (
        jobs.map((job) => (
          <UICard key={job.job_id} marginBottom="$2.5">
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$text" fontSize={14} fontWeight="500">{job.type}</Text>
              <StatusBadge status={job.status} />
            </XStack>
            {job.started_at && (
              <Text color="$textMuted" fontSize={11} marginTop="$1">
                Started: {new Date(job.started_at).toLocaleString()}
              </Text>
            )}
            {job.error && (
              <Text color="$destructive" fontSize={11} marginTop="$1" numberOfLines={2}>{job.error}</Text>
            )}
          </UICard>
        ))
      )}
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <UIInfoRow>
      <UIInfoLabel>{label}</UIInfoLabel>
      <UIInfoValue>{value}</UIInfoValue>
    </UIInfoRow>
  )
}

function ModuleRow({ label, active, field, onToggle }: {
  label: string; active: boolean; field: string; onToggle: (field: string, v: boolean) => void
}) {
  return (
    <UIInfoRow>
      <Text color="$text" fontSize={14}>{label}</Text>
      <Toggle active={active} onToggle={(v) => onToggle(field, v)} />
    </UIInfoRow>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const isSuccess = ['completed', 'success'].includes(s)
  const isError = ['failed', 'error'].includes(s)
  const isWarn = ['queued', 'pending', 'running', 'processing'].includes(s)
  const bg = isSuccess ? '$accentLight' as any : isError ? '$destructiveLight' as any : isWarn ? '$warningLight' as any : '$cardBorder' as any
  const textColor = isSuccess ? '$accent' as any : isError ? '$destructive' as any : isWarn ? '$warning' as any : '$textSecondary' as any
  return (
    <XStack backgroundColor={bg} paddingHorizontal={8} paddingVertical={3} borderRadius={6}>
      <Text fontSize={11} fontWeight="600" color={textColor} textTransform="uppercase">{status}</Text>
    </XStack>
  )
}
