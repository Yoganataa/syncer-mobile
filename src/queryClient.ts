import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createMMKV } from 'react-native-mmkv'
import { AppState, Platform } from 'react-native'
import { useEffect } from 'react'
import log from './logger'

const queryLog = log.extend('Query')

const storage = createMMKV({ id: 'react-query-cache' })

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.remove(key),
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

queryLog.debug('QueryClient initialized');

persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: mmkvStorage }),
  maxAge: 5 * 60_000,
})

export function useReactQuerySetup() {
  useEffect(() => {
    if (Platform.OS === 'web') return

    const init = async () => {
      const NetInfo = require('@react-native-community/netinfo')

      focusManager.setEventListener((handleFocus) => {
        const subscription = AppState.addEventListener('change', (state) => {
          const active = state === 'active'
          queryLog.debug(`app focus: ${active}`)
          handleFocus(active)
        })
        return () => subscription.remove()
      })

      onlineManager.setEventListener((setOnline) => {
        return NetInfo.addEventListener((state: any) => {
          const online = !!state.isConnected
          queryLog.debug(`network: ${online ? 'online' : 'offline'}`)
          setOnline(online)
        })
      })
    }
    init()
  }, [])
}
