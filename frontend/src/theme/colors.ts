/**
 * Palette taken verbatim from the Figma file (UI-IMK, "App" section). Every
 * value below is the exact hex pulled from the design via the Figma API, so the
 * implementation matches the mock-ups pixel-for-pixel.
 */
export const colors = {
  // Brand / state
  primary: '#D22D80', // magenta — active carousel card
  iconGold: '#F6B220', // gold — top-bar gear/help + settings list icons
  micGold: '#FFAE00', // gold — microphone circle (Result + VQA)

  // Mode accent colors (carousel icons when the card is NOT active)
  blue: '#5578FF', // People
  green: '#3B6C46', // Environment
  purple: '#7330F9', // Detail
  simpleGold: '#F5B45A', // Simple
  doc: '#000000', // Document (black)

  // Surfaces
  panel: '#000000', // dark rounded panels (Help / Settings / VQA / caption)
  chip: '#D9D9D9', // light-grey circle behind the top-bar icons
  cardBg: '#FFFFFF', // inactive carousel card
  screen: '#FFFFFF', // every screen background is white
  black: '#000000',

  // Text
  textOnDark: '#FFFFFF',
  textOnLight: '#000000',
  cardLabel: '#000000',
} as const;

export type AppColors = typeof colors;
