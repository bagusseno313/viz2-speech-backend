import React, { useCallback, useRef } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { speak } from '../services/speech';

const DOUBLE_TAP_MS = 320;

interface Props {
  /** Called after the "Kembali" cue to leave the screen (usually navigation.goBack). */
  onBack: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Full-screen "tap anywhere to go back" surface. Consistent with every other
 * control in the app: a single tap only SPEAKS "Kembali" (so the user knows the
 * gesture is available) and a deliberate DOUBLE TAP actually navigates back.
 * It is a plain Pressable so inner controls (the TopBar chips, the microphone)
 * win the touch and the background only reacts on empty areas.
 */
export function TapToGoBack({ onBack, children, style, accessibilityLabel }: Props) {
  const lastTap = useRef(0);

  const onPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      speak('Kembali');
      onBack();
    } else {
      lastTap.current = now;
      speak('Kembali');
    }
  }, [onBack]);

  return (
    <Pressable
      style={style}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Sentuh dua kali di mana saja untuk kembali ke kamera.">
      {children}
    </Pressable>
  );
}
