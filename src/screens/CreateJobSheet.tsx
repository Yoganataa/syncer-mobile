import { useState } from 'react'
import { YStack, Text, Input, Spinner, Sheet, Button } from 'tamagui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useToast } from '../components/Toast'
import { queryKeys } from '../queryKeys'
import log from '../logger'

interface CreateJobSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const JOB_TYPES = [
  { label: 'Live Monitor', value: 'live_monitor' },
  { label: 'Feed Scraper', value: 'feed_scraper' },
  { label: 'Bulk Scanner', value: 'bulk_scanner' },
  { label: 'Download', value: 'download' },
  { label: 'Upload Media', value: 'upload_media' },
]

export default function CreateJobSheet({ open, onOpenChange, onCreated }: CreateJobSheetProps) {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [jobType, setJobType] = useState('')
  const jobLog = log.extend('CreateJob')

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.post('/jobs', data),
    onSuccess: () => {
      jobLog.info('job created')
      show('Job created', 'success')
      onOpenChange(false)
      setUsername(''); setJobType('')
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all })
      onCreated()
    },
    onError: (e: unknown) => {
      jobLog.error('create job failed:', (e as Error).message)
      show(e instanceof Error ? e.message : 'Failed to create job', 'error')
    },
  })

  const handleCreate = () => {
    if (!username.trim() || !jobType) return
    createMutation.mutate({
      creator_username: username.trim(),
      job_type: jobType,
      platform: 'tiktok',
      scrape_interval: '*/30 * * * *',
      config: {},
    })
  }

  const canCreate = !!username.trim() && !!jobType

  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={[60]} dismissOnSnapToBottom>
      <Sheet.Overlay />
      <Sheet.Frame padding="$4" backgroundColor="$card">
        <Text fontSize={20} fontWeight="700" color="$text" fontFamily="$heading" marginBottom="$4">Create Job</Text>

        <YStack gap="$3">
          <Input
            placeholder="Creator username"
            value={username} onChangeText={setUsername}
            size="$4" autoCapitalize="none"
            backgroundColor="$cardBorder" borderWidth={0} color="$text" placeholderTextColor="$textMuted" borderRadius="$4"
            height={48}
          />

          <Text fontSize={14} color="$textSecondary" marginBottom="$1">Job Type</Text>
          <YStack gap="$2">
            {JOB_TYPES.map((jt) => (
              <YStack
                key={jt.value}
                paddingVertical={12} paddingHorizontal={16} borderRadius="$4"
                backgroundColor={jobType === jt.value ? '$accentLight' : '$cardBorder'}
                pressStyle={{ opacity: 0.85, scale: 0.96 }}
                onPress={() => setJobType(jt.value)}
              >
                <Text fontSize={14} fontWeight="600" color={jobType === jt.value ? '$accent' : '$textSecondary'}>{jt.label}</Text>
              </YStack>
            ))}
          </YStack>

          <Button
            size="$5" height={48}
            backgroundColor={canCreate ? '$accent' : '$cardBorder'}
            color={canCreate ? 'white' : '$textMuted'}
            borderRadius="$5"
            marginTop="$2"
            onPress={handleCreate}
            disabled={createMutation.isPending || !canCreate}
          >
            {createMutation.isPending ? <Spinner color="white" /> : 'Create'}
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
