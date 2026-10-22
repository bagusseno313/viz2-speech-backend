import React, { useCallback, useRef } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { speak } from '../services/speech';

const DOUBLE_TAP_MS = 320;

interface Props {
  /** Spoken aloud on a single tap so the user knows what the button is. */
  label: string;
  /** Run only on a confirming double tap. */
  onActivate: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  /** Optional spoken text on activation; defaults to re-speaking `label`. */
  activateLabel?: string;
}

/**
 * Accessible button for the blind-first interaction model: a single tap only
 * SPEAKS the button's label (so the user can explore the screen by touch without
 * triggering anything), and a deliberate DOUBLE TAP actually runs the action.
 * This mirrors how the camera screen's gestures work and is used for every
 * actionable control (back, settings, help, microphone).
 */
export function VoiceButton({
  label,
  onActivate,
  children,
  style,
  hitSlop,
  activateLabel,
}: Props) {
  const lastTap = useRef(0);

  const onPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      speak(activateLabel ?? label);
      onActivate();
    } else {
      lastTap.current = now;
      speak(label);
    }
  }, [label, activateLabel, onActivate]);

  return (
    <Pressable
      style={style}
      hitSlop={hitSlop}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Sentuh dua kali untuk menjalankan.">
      {children}
    </Pressable>
  );
}
