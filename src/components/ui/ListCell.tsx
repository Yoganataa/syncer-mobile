import { Switch } from 'react-native'
import { Text, XStack, YStack, useTheme } from 'tamagui'
import { ChevronRight } from 'lucide-react-native'

interface ListSectionProps {
  title?: string
  children: React.ReactNode
}

export function ListSection({ title, children }: ListSectionProps) {
  return (
    <YStack marginBottom="$5">
      {title && (
        <Text
          fontSize={11}
          fontWeight="600"
          color="$sectionHeader"
          letterSpacing={0.5}
          marginLeft="$4"
          marginBottom="$2"
          textTransform="uppercase"
        >
          {title}
        </Text>
      )}
      <YStack backgroundColor="$card" borderRadius="$6" overflow="hidden">
        {children}
      </YStack>
    </YStack>
  )
}

export function ListDivider() {
  return <YStack height={1} backgroundColor="$divider" />
}

interface ListToggleCellProps {
  icon?: React.ReactNode
  label: string
  value: boolean
  onToggle: (v: boolean) => void
  last?: boolean
}

export function ListToggleCell({ icon, label, value, onToggle, last = false }: ListToggleCellProps) {
  const theme = useTheme()
  return (
    <>
      <XStack paddingHorizontal="$5" height={52} alignItems="center" gap="$2.5">
        {icon && <XStack width={22}>{icon}</XStack>}
        <Text fontSize={15} fontWeight="400" color="$text" flex={1} numberOfLines={1}>
          {label}
        </Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: (theme.toggleOff?.val || '#d1d5db'), true: (theme.accent?.val || '#00aa13') }}
          thumbColor="white"
        />
      </XStack>
      {!last && <ListDivider />}
    </>
  )
}

interface ListCellProps {
  icon?: React.ReactNode
  label: string
  subtitle?: string
  right?: string | React.ReactNode
  onPress?: () => void
  last?: boolean
}

export function ListCell({ icon, label, subtitle, right, onPress, last = false }: ListCellProps) {
  const theme = useTheme()
  return (
    <>
      <XStack
        paddingHorizontal="$5" height={52} alignItems="center" gap="$2.5"
        pressStyle={onPress ? { backgroundColor: '$bg' } : undefined}
        onPress={onPress}
      >
        {icon && <XStack width={22} alignItems="center">{icon}</XStack>}
        <YStack flex={1} gap="$1">
          <Text fontSize={15} fontWeight="400" color="$text" numberOfLines={1}>
            {label}
          </Text>
          {subtitle && (
            <Text fontSize={11} color="$textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </YStack>
        {typeof right === 'string' ? (
          <Text fontSize={15} color="$textMuted" numberOfLines={1} maxWidth={120} textAlign="right" marginRight="$1">
            {right}
          </Text>
        ) : (
          right
        )}
        {onPress && <ChevronRight size={14} color={theme.textMuted?.val} />}
      </XStack>
      {!last && <ListDivider />}
    </>
  )
}

interface ListActionCellProps {
  label: string
  onPress: () => void
  destructive?: boolean
  last?: boolean
}

export function ListActionCell({ label, onPress, destructive = false, last = false }: ListActionCellProps) {
  return (
    <>
      <XStack
        paddingHorizontal="$5" height={52} alignItems="center" justifyContent="center"
        pressStyle={{ backgroundColor: '$bg' }}
        onPress={onPress}
      >
        <Text fontSize={15} fontWeight="400" color={destructive ? '$destructive' : '$text'}>
          {label}
        </Text>
      </XStack>
      {!last && <ListDivider />}
    </>
  )
}
