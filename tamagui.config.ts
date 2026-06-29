import { createTamagui, createTokens } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { createAnimations } from '@tamagui/animations-react-native'

const headingFont = createInterFont({
  size: { 1: 12, 2: 14, 3: 15, 4: 18, 5: 22, 6: 28, 7: 34, 8: 42, 9: 52 },
  weight: { 4: '400', 5: '500', 6: '600', 7: '700' },
  face: { 700: { normal: 'InterBold' } },
})

const bodyFont = createInterFont(
  { face: { 700: { normal: 'InterBold' } } },
  { sizeSize: (s) => Math.round(s * 1.1), sizeLineHeight: (s) => Math.round(s * 1.5) }
)

const animations = createAnimations({
  bouncy: { damping: 9, mass: 0.9, stiffness: 150 },
  lazy: { damping: 18, stiffness: 50 },
  quick: { damping: 18, mass: 1.2, stiffness: 250 },
})

const tokens = createTokens({
  color: {
    white: '#ffffff',
    black: '#000000',
    bg: '#f5f5f7',
    card: '#ffffff',
    cardBorder: '#f0f0f0',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    accent: '#00aa13',
    accentDark: '#008f0f',
    accentLight: '#e8f5e9',
    destructive: '#dc2626',
    destructiveLight: '#fef2f2',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    info: '#6366f1',
    infoLight: '#eef2ff',
    divider: '#e8e8e8',
    inputBg: '#f9fafb',
    inputBorder: '#e2e8f0',
    toggleOff: '#d1d5db',
    sectionHeader: '#6b7280',
    surface: '#ffffff',
    border: '#e8e8e8',
    overlay: 'rgba(0,0,0,0.3)',
    success: '#00aa13',
    successBg: '#e8f5e9',
    error: '#dc2626',
    errorBg: '#fef2f2',
    // dark bg colors
    darkBg: '#1a1a1a',
    darkBgSecondary: '#2a2a2a',
    darkCard: '#2a2a2a',
    darkText: '#f5f5f5',
    darkTextSecondary: '#9ca3af',
    darkTextMuted: '#6b7280',
    darkBorder: '#333333',
    darkInputBg: '#333333',
    darkInputBorder: '#444444',
  },
  space: {
    true: 0, none: 0, 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10,
    3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40,
  },
  size: {
    true: 0, none: 0, 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20,
    6: 24, 7: 28, 8: 32, 9: 36, 10: 40,
    $0: 0, $1: 4, $2: 8, $3: 12, $4: 16, $5: 20, $6: 24, $7: 28, $8: 32, $9: 36, $10: 40,
  },
  radius: {
    true: 0, 0: 0, 1: 3, 2: 5, 3: 7, 4: 9, 5: 12, 6: 16, 7: 20, 8: 24, 9: 28, 10: 32,
  },
  zIndex: {
    true: 0, 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600, 7: 700, 8: 800, 9: 900, 10: 1000,
  },
})

const lightTheme = {
  background: '$bg',
  backgroundHover: '$cardBorder',
  backgroundPress: '$divider',
  color: '$text',
  colorHover: '$text',
  colorPress: '$accent',
  borderColor: '$border',
  borderColorHover: '$accent',
  shadowColor: '$overlay',
  color2: '$textSecondary',
  color3: '$textMuted',
}

const darkTheme = {
  background: '$darkBg',
  backgroundHover: '$darkBgSecondary',
  backgroundPress: '#3a3a3a',
  color: '$darkText',
  colorHover: '$darkText',
  colorPress: '$accent',
  borderColor: '$darkBorder',
  borderColorHover: '$accent',
  shadowColor: 'rgba(0,0,0,0.5)',
  color2: '$darkTextSecondary',
  color3: '$darkTextMuted',
}

const config = createTamagui({
  defaultTheme: 'light',
  themes: { light: lightTheme, dark: darkTheme },
  tokens,
  shorthands,
  fonts: { heading: headingFont, body: bodyFont },
  animations: animations as any,
  media: {
    xs: { maxWidth: 660 }, sm: { maxWidth: 800 }, md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 }, xl: { maxWidth: 1420 },
    short: { maxHeight: 820 }, tall: { minHeight: 820 },
    hoverNone: { hover: 'none' }, pointerCoarse: { pointer: 'coarse' },
  },
}) as ReturnType<typeof createTamagui>

export default config
