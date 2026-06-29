import { YStack, Text, useTheme } from 'tamagui'
import { Inbox } from 'lucide-react-native'

interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const theme = useTheme()
  return (
    <YStack justifyContent="center" alignItems="center" paddingVertical="$10">
      <YStack width={64} height={64} borderRadius={32} backgroundColor="$cardBorder" justifyContent="center" alignItems="center" marginBottom="$4">
        <Inbox size={28} color={theme.textMuted?.val} />
      </YStack>
      <Text fontSize={16} fontWeight="500" color="$textSecondary" textAlign="center">{title}</Text>
      {description && <Text fontSize={14} color="$textMuted" textAlign="center" marginTop="$1" maxWidth={280}>{description}</Text>}
    </YStack>
  )
}
