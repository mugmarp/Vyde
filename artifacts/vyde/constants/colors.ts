/**
 * Vyde design tokens — dark-first cinematic palette.
 * Both light and dark keys use the same dark theme so the app
 * always renders dark regardless of device colour-scheme preference.
 */

const dark = {
  // Core surfaces
  background: '#050507',
  backgroundElevated: '#0C0C12',
  backgroundHover: '#161620',

  // Text
  foreground: '#FFFFFF',
  foregroundSecondary: '#9999A6',
  foregroundMuted: '#666675',

  // Brand
  primary: '#E84A27',
  primaryForeground: '#FFFFFF',
  primaryHover: '#FF5A36',

  // Borders
  border: '#1F1F2E',
  borderLight: '#2A2A3D',

  // useColors hook compatibility aliases
  text: '#FFFFFF',
  tint: '#E84A27',
  card: '#0C0C12',
  cardForeground: '#FFFFFF',
  muted: '#1F1F2E',
  mutedForeground: '#9999A6',
  accent: '#E84A27',
  accentForeground: '#FFFFFF',
  secondary: '#161620',
  secondaryForeground: '#FFFFFF',
  input: '#1F1F2E',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
};

const colors = {
  light: dark,
  dark,
  radius: 8,
};

export default colors;
