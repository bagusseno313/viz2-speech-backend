import React, { useCallback, useRef } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { speak } from "../services/speech";

const DOUBLE_TAP_MS = 320;

type TriggerMode = "double-tap" | "single-tap";

interface Props {
  /** Spoken aloud on a single tap so the user knows what the button is. */
  label: string;
  /** Run when the interaction is confirmed. */
  onActivate: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  /** Optional spoken text on activation; defaults to re-speaking `label`. */
  activateLabel?: string;
  /** Whether activation happens on a single tap or a confirming double tap. */
  triggerMode?: TriggerMode;
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
  triggerMode = "double-tap",
}: Props) {
  const lastTap = useRef(0);

  const onPress = useCallback(() => {
    if (triggerMode === "single-tap") {
      speak(activateLabel ?? label);
      onActivate();
      return;
    }

    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      speak(activateLabel ?? label);
      onActivate();
    } else {
      lastTap.current = now;
      speak(label);
    }
  }, [label, activateLabel, onActivate, triggerMode]);

  return (
    <Pressable
      style={style}
      hitSlop={hitSlop}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Sentuh dua kali untuk menjalankan."
    >
      {children}
    </Pressable>
  );
}
