import { styled, YStack, XStack, Text, Button } from 'tamagui'

// ─── Card ───────────────────────────────────────────
export const UICard = styled(YStack, {
  backgroundColor: '$card',
  borderRadius: '$6',
  padding: '$4',
  variants: {
    elevated: { true: {} },
    bordered: { true: { borderWidth: 1, borderColor: '$border' } },
    pressable: {
      true: { pressStyle: { opacity: 0.85, scale: 0.98 } },
    },
  } as const,
})

export const UICardTitle = styled(Text, {
  fontSize: 16,
  fontWeight: '600',
  color: '$text',
})

export const UICardDesc = styled(Text, {
  fontSize: 12,
  color: '$textMuted',
})

// ─── Badge ───────────────────────────────────────────
export const UIBadge = styled(XStack, {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
  alignItems: 'center',
  gap: 4,
  variants: {
    color: {
      success: { backgroundColor: '$accentLight' },
      warning: { backgroundColor: '$warningLight' },
      destructive: { backgroundColor: '$destructiveLight' },
      info: { backgroundColor: '$infoLight' },
      neutral: { backgroundColor: '$cardBorder' },
      accent: { backgroundColor: '$accentLight' },
    },
  } as const,
})

export const UIBadgeText = styled(Text, {
  fontSize: 11,
  fontWeight: '600',
  variants: {
    color: {
      success: { color: '$accent' },
      warning: { color: '$warning' },
      destructive: { color: '$destructive' },
      info: { color: '$info' },
      neutral: { color: '$textSecondary' },
      accent: { color: '$accent' },
    },
  } as const,
})

// ─── Dot Status ──────────────────────────────────────
export const UIStatusDot = styled(XStack, {
  width: 6,
  height: 6,
  borderRadius: 3,
  variants: {
    active: {
      true: { backgroundColor: '$destructive' },
      false: { backgroundColor: '$textMuted' },
    },
  } as const,
})

// ─── Toggle Chip ─────────────────────────────────────
export const UIToggleChip = styled(XStack, {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: '$5',
  pressStyle: { opacity: 0.8, scale: 0.96 },
  variants: {
    active: {
      true: { backgroundColor: '$accentLight' },
      false: { backgroundColor: '$cardBorder' },
    },
  } as const,
})

export const UIToggleChipText = styled(Text, {
  fontSize: 12,
  fontWeight: '600',
  variants: {
    active: {
      true: { color: '$accent' },
      false: { color: '$textMuted' },
    },
  } as const,
})

// ─── Section Header ──────────────────────────────────
export const UISectionHeader = styled(Text, {
  fontSize: 11,
  fontWeight: '600',
  color: '$sectionHeader',
  letterSpacing: 0.5,
  marginLeft: '$4',
  marginBottom: '$2',
  textTransform: 'uppercase',
})

// ─── Page Title ──────────────────────────────────────
export const UIPageTitle = styled(Text, {
  fontSize: 28,
  fontWeight: '700',
  color: '$text',
  fontFamily: '$heading',
})

export const UIPageSubtitle = styled(Text, {
  fontSize: 14,
  color: '$textSecondary',
})

// ─── Metric Tile ─────────────────────────────────────
export const UIMetricValue = styled(Text, {
  fontWeight: '700',
  variants: {
    size: {
      large: { fontSize: 32 },
      small: { fontSize: 24 },
    },
  } as const,
})

export const UIMetricLabel = styled(Text, {
  fontSize: 11,
  color: '$textSecondary',
})

// ─── Action Button Small ─────────────────────────────
export const UIActionBtn = styled(XStack, {
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: '$5',
  pressStyle: { opacity: 0.8, scale: 0.95 },
  variants: {
    color: {
      default: { backgroundColor: '$cardBorder' },
      danger: { backgroundColor: '$destructiveLight' },
      success: { backgroundColor: '$accentLight' },
      accent: { backgroundColor: '$accent' },
    },
  } as const,
})

export const UIActionBtnText = styled(Text, {
  fontSize: 11,
  variants: {
    color: {
      default: { color: '$textSecondary' },
      danger: { color: '$destructive', fontWeight: '600' },
      success: { color: '$accent', fontWeight: '600' },
      accent: { color: 'white', fontWeight: '600' },
    },
  } as const,
})

// ─── Segmented Button ────────────────────────────────
export const UISegment = styled(YStack, {
  flex: 1,
  paddingVertical: 10,
  borderRadius: '$5',
  alignItems: 'center',
  pressStyle: { opacity: 0.85, scale: 0.97 },
  variants: {
    active: {
      true: { backgroundColor: '$accent' },
      false: { backgroundColor: '$card', borderWidth: 1, borderColor: '$inputBorder' },
    },
  } as const,
})

export const UISegmentText = styled(Text, {
  fontSize: 11,
  fontWeight: '600',
  variants: {
    active: {
      true: { color: 'white' },
      false: { color: '$textMuted' },
    },
  } as const,
})

// ─── Circle Icon Button ──────────────────────────────
export const UICircleBtn = styled(YStack, {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '$cardBorder',
  justifyContent: 'center',
  alignItems: 'center',
  pressStyle: { opacity: 0.8, scale: 0.92 },
  variants: {
    color: {
      primary: { backgroundColor: '$accent' },
      danger: { backgroundColor: '$destructiveLight' },
    },
  } as const,
})

// ─── Search Bar ──────────────────────────────────────
export const UISearchBar = styled(XStack, {
  backgroundColor: '$cardBorder',
  borderRadius: '$5',
  paddingHorizontal: '$3',
  alignItems: 'center',
  gap: '$2',
})

// ─── Divider ─────────────────────────────────────────
export const UIDivider = styled(YStack, {
  height: 1,
  backgroundColor: '$divider',
  variants: {
    inset: {
      true: { marginLeft: 48 },
    },
  } as const,
})

// ─── Info Row ────────────────────────────────────────
export const UIInfoRow = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: '$1',
})

export const UIInfoLabel = styled(Text, {
  fontSize: 13,
  color: '$textSecondary',
})

export const UIInfoValue = styled(Text, {
  fontSize: 13,
  color: '$text',
  textAlign: 'right',
})
