import type { ModeKey } from '../data/modes';

/**
 * Flow (mirrors the Figma frame names): Entry → Camera → VQA, with Help and
 * Settings reachable as modal-style screens from the top bar on any screen.
 *
 * Scan / Processing / Result are NOT separate routes — they are phases of the
 * single Camera screen (the Figma "Scan_*", "Processing_*", "Result_*" frames
 * are the per-mode design states of that one screen).
 */
export type RootStackParamList = {
  Entry: undefined;
  Camera: undefined;
  VQA: { mode: ModeKey; caption: string };
  Help: undefined;
  Setting: undefined;
};
