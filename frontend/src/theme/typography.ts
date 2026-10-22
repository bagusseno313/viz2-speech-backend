/**
 * Font families used in the Figma design. The body / UI font is Inter (in a
 * range of weights) and the headline / VQA copy is Plus Jakarta Sans. The
 * matching @expo-google-fonts packages are loaded in App.tsx; until they are
 * ready the app renders nothing (see useAppFonts).
 *
 * Always set `fontFamily` (not `fontWeight`) so the correct weight is picked —
 * Android only ships a couple of system weights, so relying on fontWeight alone
 * would not reproduce the ExtraBold (800) labels in the design.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
} as const;
