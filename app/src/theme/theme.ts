// Design tokens shared across the demo app. Screens reference these instead of
// hardcoding literals, so the look is changed in one place.

export const colors = {
  background: '#fafafa',
  surface: '#ffffff',
  header: '#2196F3',
  accent: '#2196F3',
  textPrimary: '#212121',
  textInverse: '#ffffff',
  textMuted: '#757575',
  errorSurface: '#fdecea',
  errorText: '#b71c1c',
  divider: '#e0e0e0',
  tabIndicator: '#ffffff',
  tabInactive: 'rgba(255,255,255,0.7)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radius = {
  sm: 6,
  md: 8,
} as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '500' },
  body: { fontSize: 16 },
  label: { fontSize: 14 },
  subtitle: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 13 },
  small: { fontSize: 12, lineHeight: 17 },
} as const;

// Card elevation reused by list items and inputs.
export const cardShadow = {
  elevation: 2,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
} as const;

// Stronger elevation for panels that float above the map.
export const cardShadowElevated = {
  elevation: 4,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
} as const;

/**
 * SDK-examples redesign tokens. New-design screens import `design`; the older tokens
 * above stay for the other demos. Values come from the design handoff spec.
 */
export const design = {
  color: {
    ink: '#16191F',
    inkDeep: '#0E141F',
    body: '#1F242C',
    muted: '#8A909C',
    muted2: '#9298A4',
    accent: '#3B6EF6',
    accentTint: '#EAF0FF',
    accentBorder: '#D8E4FF',
    red: '#E5484D',
    redFill: 'rgba(238,64,54,0.18)',
    redStroke: 'rgba(238,64,54,0.85)',
    successText: '#2B9157',
    successBg: '#E3F4E7',
    surface: '#FFFFFF',
    appBg: '#F3F4F7',
    divider: '#F1F2F5',
    hairline: 'rgba(20,24,32,0.06)',
    trackOff: '#D8DBE2',
    // Frosted bar. The spec is rgba(255,255,255,.74) + blur(18); we don't add blur
    // (no vetted package), so without it we keep the fill nearly opaque.
    frostedBar: 'rgba(255,255,255,0.92)',
    coachBg: 'rgba(14,20,31,0.92)',
    onDark: '#FFFFFF',
  },
  // Bundled font families (assets/fonts, linked via react-native-asset).
  font: {
    display: 'SpaceGrotesk-SemiBold',
    ui: 'DMSans-Regular',
    uiMedium: 'DMSans-Medium',
    uiSemiBold: 'DMSans-SemiBold',
    mono: 'SpaceMono-Regular',
    monoBold: 'SpaceMono-Bold',
  },
  radius: {
    tile: 12,
    pill: 22,
    card: 18,
    sheet: 24,
    switchTrack: 14,
  },
  // RN approximation of the CSS box-shadow from the spec (RN has no spread or layers).
  shadowCard: {
    elevation: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  shadowSheet: {
    elevation: 16,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
} as const;
