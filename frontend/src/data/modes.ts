import { colors } from '../theme/colors';

/**
 * Caption modes. The carousel order is circular and matches the "Carousel Mode"
 * component variants in Figma: Document → People → Environment → Simple → Detail.
 * The app starts centered on Environment.
 */
export type ModeKey = 'document' | 'people' | 'environment' | 'simple' | 'detail';

export interface Mode {
  key: ModeKey;
  /** Uppercase label shown on the carousel card (matches the design). */
  label: string;
  /** Natural-language name spoken aloud (Indonesian) when the mode becomes active. */
  spokenLabel: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  /** Accent color used for the icon when the card is NOT active. */
  color: string;
}

export const MODES: Mode[] = [
  {
    key: 'document',
    label: 'DOCUMENT',
    spokenLabel: 'Mode Dokumen',
    icon: 'file-document-outline',
    color: colors.doc,
  },
  {
    key: 'people',
    label: 'PEOPLE',
    spokenLabel: 'Mode Orang',
    icon: 'account',
    color: colors.blue,
  },
  {
    key: 'environment',
    label: 'ENVIRONMENT',
    spokenLabel: 'Mode Lingkungan',
    icon: 'pine-tree',
    color: colors.green,
  },
  {
    key: 'simple',
    label: 'SIMPLE',
    spokenLabel: 'Mode Sederhana',
    icon: 'lightning-bolt',
    color: colors.simpleGold,
  },
  {
    key: 'detail',
    label: 'DETAIL',
    spokenLabel: 'Mode Detail',
    icon: 'camera-iris',
    color: colors.purple,
  },
];

export const DEFAULT_MODE_INDEX = MODES.findIndex((m) => m.key === 'environment');

/** Circular helpers so the carousel can always show a previous / next card. */
export const wrapIndex = (i: number) => (i + MODES.length) % MODES.length;
export const modeAt = (i: number) => MODES[wrapIndex(i)];
