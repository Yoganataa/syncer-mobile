import { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { YStack, Text, Spinner, useTheme } from 'tamagui'
import { LayoutDashboard, Users, List, Repeat } from 'lucide-react-native'
import { useAuth } from '../AuthContext'
import { ToastProvider } from '../components/Toast'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import CreatorsScreen from '../screens/CreatorsScreen'
import CreatorDetailScreen from '../screens/CreatorDetailScreen'
import JobsScreen from '../screens/JobsScreen'
import RelaysScreen from '../screens/RelaysScreen'

const Tab = createBottomTabNavigator()

const iconMap: Record<string, any> = {
  Dashboard: LayoutDashboard,
  Creators: Users,
  Jobs: List,
  Relays: Repeat,
}

function CreatorsWrapper() {
  const [detailUsername, setDetailUsername] = useState<string | null>(null)
  if (detailUsername) {
    return (
      <CreatorDetailScreen
        username={detailUsername}
        onBack={() => setDetailUsername(null)}
      />
    )
  }
  return <CreatorsScreen onSelectCreator={(u: string) => setDetailUsername(u)} />
}

function LoadingScreen() {
  return (
    <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center">
      <Spinner size="large" color="$accent" />
    </YStack>
  )
}

export default function AppNavigator() {
  const { token, loading } = useAuth()
  const theme = useTheme()

  if (loading) {
    return <LoadingScreen />
  }

  if (!token) {
    return <LoginScreen />
  }

  return (
    <ToastProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            const Icon = iconMap[route.name]
            return Icon ? <Icon size={size} color={color} /> : null
          },
          tabBarActiveTintColor: theme.accent?.val || '#00aa13',
          tabBarInactiveTintColor: theme.textMuted?.val || '#999999',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarStyle: {
            backgroundColor: theme.card?.val || '#ffffff',
            borderTopColor: theme.divider?.val || '#e8e8e8',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 6,
            height: 60,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Creators" component={CreatorsWrapper} />
        <Tab.Screen name="Jobs" component={JobsScreen} />
        <Tab.Screen name="Relays" component={RelaysScreen} />
      </Tab.Navigator>
    </ToastProvider>
  )
}
