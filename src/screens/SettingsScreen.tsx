import { useState } from 'react'
import { Alert } from 'react-native'
import { YStack, XStack, Text, Card, Button, Spinner } from 'tamagui'
import { useAuth } from '../AuthContext'

export default function SettingsScreen() {
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin logout?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          await logout()
          setLoggingOut(false)
        },
      },
    ])
  }

  return (
    <YStack flex={1} backgroundColor="$bg" padding="$4">
      <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading" marginBottom="$6" marginTop="$2">
        Settings
      </Text>

      <YStack marginBottom="$6">
        <Text fontSize={14} fontWeight="600" color="$textMuted" textTransform="uppercase" letterSpacing={1} marginBottom="$2">
          Account
        </Text>
        <Card padding="$4" backgroundColor="$card" borderRadius="$6">
          <Button chromeless color="$destructive" padding="$0" onPress={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Spinner /> : 'Logout'}
          </Button>
        </Card>
      </YStack>

      <YStack>
        <Text fontSize={14} fontWeight="600" color="$textMuted" textTransform="uppercase" letterSpacing={1} marginBottom="$2">
          App
        </Text>
        <Card padding="$4" backgroundColor="$card" borderRadius="$6">
          <XStack justifyContent="space-between" alignItems="center">
            <Text color="$text" fontSize={15}>Version</Text>
            <Text color="$textMuted" fontSize={15}>1.0.0</Text>
          </XStack>
        </Card>
      </YStack>
    </YStack>
  )
}
