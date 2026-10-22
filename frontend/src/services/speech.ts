import * as Speech from "expo-speech";

import { AI_CONFIG } from "./aiConfig";

type SpeakOptions = Speech.SpeechOptions & { interrupt?: boolean };

/**
 * Thin wrapper around expo-speech. Centralizes the Indonesian voice config so
 * every spoken cue (mode names, captions, answers) sounds consistent. This app
 * is built for visually impaired users, so almost every state change speaks.
 */
const DEFAULT_OPTIONS: Speech.SpeechOptions = {
  language: "id-ID",
  pitch: 1.0,
  rate: 1.0,
};

async function tryBackendTts(text: string, options?: Speech.SpeechOptions) {
  const configuredUrl = process.env.EXPO_PUBLIC_AI_API_URL;
  const useFakeAi = process.env.EXPO_PUBLIC_USE_FAKE_AI === "true";

  if (!text?.trim() || !configuredUrl || useFakeAi) {
    return false;
  }

  try {
    const response = await fetch(
      `${AI_CONFIG.apiBaseUrl}${AI_CONFIG.endpoints.tts}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          language: options?.language ?? DEFAULT_OPTIONS.language,
        }),
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return Boolean(payload?.audioUrl || payload?.status);
  } catch {
    return false;
  }
}

export function speak(text: string, options: SpeakOptions = {}) {
  const { interrupt = true, ...speechOptions } = options;

  if (interrupt) {
    Speech.stop();
  }

  const value = String(text ?? "").trim();
  if (!value) {
    return;
  }

  void tryBackendTts(value, speechOptions);
  Speech.speak(value, { ...DEFAULT_OPTIONS, ...speechOptions });
}

/**
 * Speak without interrupting the current utterance — the text is appended to the
 * queue and played once the current one finishes. Used e.g. to announce the
 * active mode ("Mode Lingkungan") right after the "Kembali" cue when returning
 * to the camera, so both are heard in order.
 */
export function speakQueued(text: string, options?: Speech.SpeechOptions) {
  const value = String(text ?? "").trim();
  if (!value) {
    return;
  }

  void tryBackendTts(value, options);
  Speech.speak(value, { ...DEFAULT_OPTIONS, ...options });
}

export function stopSpeaking() {
  Speech.stop();
}

export function isSpeaking() {
  return Speech.isSpeakingAsync();
}
