import { XStack } from 'tamagui'

interface ToggleProps {
  active: boolean
  onToggle: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ active, onToggle, disabled }: ToggleProps) {
  return (
    <XStack
      width={44}
      height={24}
      borderRadius={12}
      backgroundColor={active ? '$accent' : '$toggleOff'}
      justifyContent={active ? 'flex-end' : 'flex-start'}
      alignItems="center"
      padding={2}
      opacity={disabled ? 0.5 : 1}
      onPress={() => !disabled && onToggle(!active)}
      pressStyle={{ opacity: 0.8, scale: 0.96 }}
    >
      <XStack width={20} height={20} borderRadius={10} backgroundColor="white" />
    </XStack>
  )
}
