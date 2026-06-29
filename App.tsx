import { useEffect } from 'react'
import { TamaguiProvider } from 'tamagui'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './src/AuthContext'
import { queryClient, useReactQuerySetup } from './src/queryClient'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { OfflineBanner } from './src/components/OfflineBanner'
import { ThemeProvider, useThemeMode } from './src/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'
import config from './tamagui.config'

function AppContent() {
  const { isDark } = useThemeMode()
  useReactQuerySetup()
  return (
    <AuthProvider>
      <NavigationContainer>
        <ErrorBoundary>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppNavigator />
          <OfflineBanner />
        </ErrorBoundary>
      </NavigationContainer>
    </AuthProvider>
  )
}

export default function App() {
  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Regular.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  if (!loaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme="light">
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  )
}
