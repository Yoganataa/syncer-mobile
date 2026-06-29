import { YStack, Text } from 'tamagui'

interface StatBoxProps {
  label: string
  value: string | number
  color?: string
  highlight?: boolean
}

export function StatBox({ label, value, color, highlight }: StatBoxProps) {
  return (
    <YStack
      padding="$3" backgroundColor="$card" borderRadius="$5" flex={1} alignItems="center" gap="$1"
    >
      <Text fontSize={24} fontWeight="700" color={highlight ? '$accent' : color || '$text'}>{value}</Text>
      <Text fontSize={12} color="$textSecondary">{label}</Text>
    </YStack>
  )
}
