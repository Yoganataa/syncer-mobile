import { XStack, Text } from 'tamagui'

function getStatusVariant(status: string): string {
  const s = status.toLowerCase()
  if (
    ['completed', 'success', 'live', 'active', 'valid', 'ok', 'healthy'].some(
      (x) => s.includes(x) || s === x
    )
  )
    return 'success'
  if (
    ['failed', 'error', 'invalid', 'cancelled', 'paused', 'offline'].some(
      (x) => s.includes(x) || s === x
    )
  )
    return 'destructive'
  if (
    ['warning', 'warn', 'pending', 'queued', 'processing', 'stream_pending', 'running'].some(
      (x) => s.includes(x) || s === x
    )
  )
    return 'warning'
  return 'secondary'
}
export { getStatusVariant }

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const v = getStatusVariant(status)
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    success: { bg: '$accentLight', text: '$accent', dot: '$accent' },
    destructive: { bg: '$destructiveLight', text: '$destructive', dot: '$destructive' },
    warning: { bg: '$warningLight', text: '$warning', dot: '$warning' },
    secondary: { bg: '$cardBorder', text: '$textSecondary', dot: '$textMuted' },
  }
  const c = colors[v] || colors.secondary
  const isSm = size === 'sm'

  return (
    <XStack
      backgroundColor={c.bg as any}
      borderRadius={999}
      borderWidth={1}
      borderColor={c.bg as any}
      paddingHorizontal={isSm ? 6 : 8}
      paddingVertical={isSm ? 2 : 4}
      alignItems="center"
      gap="$1"
    >
      <XStack width={isSm ? 5 : 6} height={isSm ? 5 : 6} borderRadius={3} backgroundColor={c.dot as any} />
      <Text fontSize={isSm ? 10 : 12} fontWeight="600" color={c.text} textTransform="uppercase">{status}</Text>
    </XStack>
  )
}
