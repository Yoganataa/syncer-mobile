import { YStack, XStack, Text } from 'tamagui'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap="$3">
      <YStack gap="$1">
        <Text fontSize={28} fontWeight="700" color="$text">{title}</Text>
        {description && <Text fontSize={14} color="$textSecondary">{description}</Text>}
      </YStack>
      {action}
    </XStack>
  )
}
