import { useState, useCallback, useMemo, useRef } from 'react'
import React from 'react'
import { RefreshControl, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { YStack, XStack, Text, Spinner, Input, Sheet, ScrollView, useTheme } from 'tamagui'
import { Plus, X, RotateCcw, FolderOpen, Search, Trash2 } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { queryKeys } from '../queryKeys'
import log from '../logger'
import CreateJobSheet from './CreateJobSheet'
import ExplorerScreen from './ExplorerScreen'
import type { Job } from '../types'
import { EmptyState } from '../components/ui/EmptyState'
import { UICard, UICardTitle, UICardDesc, UICircleBtn, UISearchBar, UIActionBtn, UIActionBtnText, UISectionHeader, UISegment, UISegmentText, UIInfoRow, UIInfoLabel, UIInfoValue } from '../components/ui/styled'

const STATUS_FILTERS = ['all', 'queued', 'running', 'completed', 'failed', 'error'] as const

const JobItem = React.memo(function JobItem({
  item, canCancel, canRetry,
  onCancel, onRetry, onViewError, theme,
}: {
  item: Job; canCancel: boolean; canRetry: boolean
  onCancel: (id: string) => void; onRetry: (id: string) => void; onViewError: (job: Job) => void
  theme: ReturnType<typeof useTheme>
}) {
  const status = item.status.toLowerCase()
  const isSuccess = ['completed', 'success'].includes(status)
  const isError = ['failed', 'error'].includes(status)
  const badgeBg = isSuccess ? '$accentLight' : isError ? '$destructiveLight' : '$warningLight'
  const badgeColor = isSuccess ? '$accent' : isError ? '$destructive' : '$warning'

  return (
    <UICard marginBottom="$2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center">
            <UICardTitle>{item.type}</UICardTitle>
            <Text fontSize="$1" color="$textMuted" fontFamily="monospace">
              #{item.job_id?.substring(0, 8)}
            </Text>
          </XStack>
          <UICardDesc>@{item.username}</UICardDesc>
        </YStack>
        <XStack backgroundColor={badgeBg as any} paddingHorizontal={8} paddingVertical={3} borderRadius={6}>
          <Text fontSize="$1" fontWeight="600" color={badgeColor as any} textTransform="uppercase">{item.status}</Text>
        </XStack>
      </XStack>

      {item.source_url && (
        <Text color="$textMuted" fontSize="$2" marginTop={4} numberOfLines={1}>{item.source_url}</Text>
      )}

      {item.error && (
        <Text color="$destructive" fontSize="$2" marginTop={4} numberOfLines={1} onPress={() => onViewError(item)}>
          {item.error}
        </Text>
      )}

      <XStack gap="$2" marginTop="$3" alignItems="center" borderTopWidth={1} borderTopColor="$divider" paddingTop="$3">
        {canCancel && (
          <UIActionBtn color="danger" onPress={() => onCancel(item.job_id)}>
            <X size={12} color={theme.destructive?.val} />
            <UIActionBtnText color="danger">Cancel</UIActionBtnText>
          </UIActionBtn>
        )}
        {canRetry && (
          <UIActionBtn color="success" onPress={() => onRetry(item.job_id)}>
            <RotateCcw size={12} color={theme.accent?.val} />
            <UIActionBtnText color="success">Retry</UIActionBtnText>
          </UIActionBtn>
        )}
        {item.error && (
          <Text fontSize="$1" color="$textSecondary" pressStyle={{ opacity: 0.6 }} onPress={() => onViewError(item)}>
            View Error
          </Text>
        )}
        <Text color="$textMuted" fontSize="$1" marginLeft="auto">
          {item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}
        </Text>
      </XStack>
    </UICard>
  )
})

export default function JobsScreen() {
  const [showExplorer, setShowExplorer] = useState(false)
  if (showExplorer) return <ExplorerScreen onBack={() => setShowExplorer(false)} />
  return <JobsContent onExplorer={() => setShowExplorer(true)} />
}

function JobsContent({ onExplorer }: { onExplorer: () => void }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const refreshingRef = useRef(false)
  const jobLog = log.extend('Jobs')

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: () => api.get<Job[]>('/jobs/'),
    refetchInterval: 45_000,
    staleTime: 45_000,
  })

  const onRefresh = useCallback(async () => {
    refreshingRef.current = true
    await refetch()
    refreshingRef.current = false
  }, [refetch])

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/cancel`),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all })
      const prev = queryClient.getQueryData<Job[]>(queryKeys.jobs.all)
      if (prev) {
        queryClient.setQueryData<Job[]>(queryKeys.jobs.all, prev.map((j) =>
          j.job_id === jobId ? { ...j, status: 'cancelled' as const } : j
        ))
      }
      return { prev }
    },
    onError: (_e, _jobId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.jobs.all, ctx.prev)
      jobLog.error('cancel job failed:', (_e as Error).message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/retry`),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all })
      const prev = queryClient.getQueryData<Job[]>(queryKeys.jobs.all)
      if (prev) {
        queryClient.setQueryData<Job[]>(queryKeys.jobs.all, prev.map((j) =>
          j.job_id === jobId ? { ...j, status: 'queued' as const } : j
        ))
      }
      return { prev }
    },
    onError: (_e, _jobId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.jobs.all, ctx.prev)
      jobLog.error('retry job failed:', (_e as Error).message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  })

  const purgeMutation = useMutation({
    mutationFn: () => api.post('/jobs/purge', { topic: 'all', kind: 'error', limit: '100' }),
    onSuccess: () => {
      jobLog.info('purged failed jobs')
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all })
    },
    onError: (e: unknown) => {
      jobLog.error('purge failed:', (e as Error).message)
    },
  })

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const q = searchQuery.toLowerCase()
      if (q) {
        const match = (j.job_id?.toLowerCase() || '').includes(q)
          || (j.type?.toLowerCase() || '').includes(q)
          || (j.username?.toLowerCase() || '').includes(q)
          || (j.source_url?.toLowerCase() || '').includes(q)
        if (!match) return false
      }
      if (statusFilter !== 'all' && j.status !== statusFilter) return false
      return true
    })
  }, [jobs, searchQuery, statusFilter])

  const renderItem = useCallback(({ item }: { item: Job }) => {
    const canCancel = item.status === 'queued' || item.status === 'running'
    const canRetry = item.status === 'failed' || item.status === 'error'
    return (
      <JobItem
        item={item}
        canCancel={canCancel}
        canRetry={canRetry}
        onCancel={(id) => cancelMutation.mutate(id)}
        onRetry={(id) => retryMutation.mutate(id)}
        onViewError={setSelectedJob}
        theme={theme}
      />
    )
  }, [cancelMutation, retryMutation, setSelectedJob, theme])

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$accent" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlashList
        style={{ flex: 1 }}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item: Job) => item.job_id}
        refreshControl={<RefreshControl refreshing={refreshingRef.current} onRefresh={onRefresh} tintColor={(theme.accent?.val || '#00aa13')} />}
        ListHeaderComponent={
          <YStack padding="$5" gap="$3" paddingTop={60}>
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={2}>
                <Text fontSize="$8" fontWeight="700" color="$text">Jobs</Text>
                <Text fontSize="$4" color="$textSecondary">Monitor and manage tasks</Text>
              </YStack>
              <XStack gap="$2">
                <UICircleBtn onPress={onExplorer}>
                  <FolderOpen size={20} color={theme.textSecondary?.val} />
                </UICircleBtn>
                <UICircleBtn color="primary" onPress={() => setSheetOpen(true)}>
                  <Plus size={20} color="white" />
                </UICircleBtn>
              </XStack>
            </XStack>
            <UISearchBar>
              <Search size={16} color={theme.textMuted?.val} />
              <Input
                placeholder="Search jobs..."
                value={searchQuery} onChangeText={(t) => setSearchQuery(t)}
                flex={1} size="$4"
                backgroundColor="transparent" borderWidth={0} color="$text" placeholderTextColor="$textMuted"
                paddingLeft={0} height={36}
              />
            </UISearchBar>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$2">
                {STATUS_FILTERS.map((f) => (
                  <UISegment key={f} active={statusFilter === f} onPress={() => setStatusFilter(f)}>
                    <UISegmentText active={statusFilter === f}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </UISegmentText>
                  </UISegment>
                ))}
              </XStack>
            </ScrollView>
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textMuted" fontSize="$2">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</Text>
              <UIActionBtn color="danger" onPress={() => Alert.alert('Purge Failed Jobs', 'Delete all failed/error job records?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Purge', style: 'destructive', onPress: () => purgeMutation.mutate() },
              ])}>
                <Trash2 size={12} color={theme.destructive?.val} />
                <UIActionBtnText color="danger">Purge Errors</UIActionBtnText>
              </UIActionBtn>
            </XStack>
          </YStack>
        }
        ListEmptyComponent={<EmptyState title={searchQuery || statusFilter !== 'all' ? 'No jobs match your filters.' : 'No jobs found.'} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <CreateJobSheet open={sheetOpen} onOpenChange={setSheetOpen} onCreated={() => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all })} />

      <Sheet open={!!selectedJob} onOpenChange={(o: boolean) => { if (!o) setSelectedJob(null) }} snapPoints={[65]} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$card">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <Text fontSize="$7" fontWeight="700" color="$text">Job Error</Text>
            <UICircleBtn onPress={() => setSelectedJob(null)}>
              <X size={18} color={theme.textSecondary?.val} />
            </UICircleBtn>
          </XStack>
          <ScrollView>
            <YStack gap="$3">
              <DetailRow label="Job ID" value={selectedJob?.job_id || ''} mono />
              <DetailRow label="Type" value={selectedJob?.type || ''} />
              <DetailRow label="Status" value={selectedJob?.status || ''} status />
              <DetailRow label="Username" value={`@${selectedJob?.username || ''}`} />
              {selectedJob?.attempts != null && (
                <DetailRow label="Attempts" value={`${selectedJob.attempts}/${selectedJob.max_attempts || '?'}`} />
              )}
              <DetailRow label="Updated" value={selectedJob?.updated_at ? new Date(selectedJob.updated_at).toLocaleString() : '-'} />
              {selectedJob?.source_url && <DetailRow label="Source URL" value={selectedJob.source_url} />}
              {selectedJob?.progress?.message && (
                <YStack gap="$1">
                  <Text color="$textSecondary" fontSize="$4">Progress</Text>
                  <YStack padding="$3" backgroundColor="$accentLight" borderRadius="$5">
                    <Text color="$accent" fontSize="$2">{selectedJob.progress.message}</Text>
                  </YStack>
                </YStack>
              )}
              {selectedJob?.error && (
                <YStack gap="$1">
                  <Text color="$textSecondary" fontSize="$4">Error</Text>
                  <YStack padding="$3" backgroundColor="$destructiveLight" borderRadius="$5">
                    <Text color="$destructive" fontSize="$2" fontFamily="monospace" lineHeight={18}>{selectedJob.error}</Text>
                  </YStack>
                  {(selectedJob as any).error_traceback && (
                    <YStack padding="$3" backgroundColor="$darkBg" borderRadius="$5" maxHeight={200}>
                      <ScrollView>
                        <Text color="$divider" fontSize="$1" fontFamily="monospace" lineHeight={16}>
                          {(selectedJob as any).error_traceback}
                        </Text>
                      </ScrollView>
                    </YStack>
                  )}
                </YStack>
              )}
            </YStack>
          </ScrollView>
          <YStack marginTop="$4" paddingVertical={12} borderRadius="$5" backgroundColor="$background" alignItems="center" pressStyle={{ opacity: 0.8, scale: 0.97 }} onPress={() => setSelectedJob(null)}>
            <Text fontSize="$4" color="$text">Close</Text>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  )
}

function DetailRow({ label, value, mono, status }: { label: string; value: string; mono?: boolean; status?: boolean }) {
  const s = value.toLowerCase()
  const statusColor = status
    ? (['completed', 'success'].some((x) => s.includes(x)) ? '$accent'
      : ['failed', 'error'].some((x) => s.includes(x)) ? '$destructive'
      : '$warning')
    : '$text'
  return (
    <UIInfoRow>
      <UIInfoLabel>{label}</UIInfoLabel>
      <UIInfoValue color={statusColor as any} fontWeight={status ? '600' : '500'} fontFamily={mono ? 'monospace' : undefined}>{value}</UIInfoValue>
    </UIInfoRow>
  )
}
