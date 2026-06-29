import { XStack, Text } from 'tamagui'

const variants: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: '$accentLight', text: '$accent', dot: '$accent' },
  secondary: { bg: '$cardBorder', text: '$textSecondary', dot: '$textMuted' },
  success: { bg: '$accentLight', text: '$accent', dot: '$accent' },
  destructive: { bg: '$destructiveLight', text: '$destructive', dot: '$destructive' },
  warning: { bg: '$warningLight', text: '$warning', dot: '$warning' },
  outline: { bg: 'transparent', text: '$textSecondary', dot: '$textMuted' },
}

interface BadgeProps {
  variant?: keyof typeof variants
  dot?: boolean
  label: string
}

export function Badge({ variant = 'default', dot: showDot, label }: BadgeProps) {
  const v = variants[variant]
  return (
    <XStack
      backgroundColor={v.bg}
      borderRadius={6}
      paddingHorizontal="$2"
      paddingVertical="$1"
      alignItems="center"
      gap="$1"
    >
      {showDot && <XStack width={6} height={6} borderRadius={3} backgroundColor={v.dot as any} />}
      <Text fontSize={11} fontWeight="600" color={v.text}>{label ?? ''}</Text>
    </XStack>
  )
}
