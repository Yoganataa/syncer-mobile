import { YStack, Text, type YStackProps } from 'tamagui'

export function Card({ children, ...props }: YStackProps) {
  return (
    <YStack
      backgroundColor="$card" borderRadius="$6" padding="$4"
      {...props}
    >
      {children}
    </YStack>
  )
}

export function CardHeader({ children, ...props }: YStackProps) {
  return <YStack gap="$1.5" paddingBottom="$4" {...props}>{children}</YStack>
}

export function CardTitle({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <Text fontSize={18} fontWeight="600" color="$text" {...props}>{children}</Text>
}

export function CardDescription({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <Text fontSize={14} color="$textSecondary" {...props}>{children}</Text>
}

export function CardContent({ children, ...props }: YStackProps) {
  return <YStack {...props}>{children}</YStack>
}
