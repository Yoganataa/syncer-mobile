import { useState, useEffect } from 'react'
import { Platform } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useQueryClient } from '@tanstack/react-query'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (Platform.OS === 'web') return

    const NetInfo = require('@react-native-community/netinfo')
    const unsub = NetInfo.addEventListener((state: any) => {
      const wasOffline = offline
      const isOnline = !!state.isConnected
      setOffline(!isOnline)

      if (wasOffline && isOnline) {
        queryClient.invalidateQueries()
      }
    })
    return () => unsub()
  }, [])

  if (!offline) return null

  return (
    <YStack
      position="absolute" top={50} left={0} right={0} zIndex={99999}
      backgroundColor="$destructive" paddingVertical={6} paddingHorizontal={16}
      alignItems="center"
    >
      <Text color="white" fontSize={12} fontWeight="600">
        No internet connection
      </Text>
    </YStack>
  )
}
