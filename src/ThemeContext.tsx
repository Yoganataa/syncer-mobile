import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Theme } from 'tamagui'
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'theme-storage' })
const THEME_KEY = 'is_dark'

interface ThemeCtx {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return storage.getString(THEME_KEY) === 'true'
    } catch {
      return false
    }
  })

  const toggleTheme = useCallback(() => setIsDark((p) => !p), [])

  useEffect(() => {
    storage.set(THEME_KEY, isDark)
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <Theme name={isDark ? 'dark' : 'light'}>{children}</Theme>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeContext)
}
