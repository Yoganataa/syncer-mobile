import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { YStack, Text, useTheme } from 'tamagui'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastCtx {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const theme = useTheme()

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => remove(id), 3000)
    timers.current.set(id, timer)
  }, [remove])

  const bgColor = {
    success: theme.accent?.val || '#065f46',
    error: theme.destructive?.val || '#7f1d1d',
    info: theme.info?.val || '#1e3a5f',
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <YStack position="absolute" bottom={100} left={16} right={16} zIndex={100000} gap="$2" pointerEvents="box-none">
        {toasts.map((t) => (
          <YStack
            key={t.id}
            backgroundColor={bgColor[t.type]}
            padding="$3"
            borderRadius="$3"
            opacity={0.95}
          >
            <Text color="white" fontSize={14} textAlign="center">{t.message}</Text>
          </YStack>
        ))}
      </YStack>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
