import * as FileSystem from "expo-file-system/legacy";

import { AI_CONFIG } from "./aiConfig";

interface SttBackendResponse {
  text?: string;
  transcript?: string;
  result?: string;
  data?: { text?: string };
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const envUrl = process.env.EXPO_PUBLIC_AI_API_URL;
  const envUseFakeAi = process.env.EXPO_PUBLIC_USE_FAKE_AI;

  if (
    !audioUri ||
    typeof process === "undefined" ||
    envUrl === undefined ||
    envUseFakeAi === "true"
  ) {
    return "";
  }

  const endpoint = `${AI_CONFIG.apiBaseUrl}${AI_CONFIG.endpoints.stt}`;

  try {
    const uploadResult = await FileSystem.uploadAsync(endpoint, audioUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "audio",
      mimeType: "audio/wav",
      headers: {
        Accept: "application/json",
      },
    });

    if (uploadResult.status !== 200 && uploadResult.status !== 201) {
      throw new Error(`STT backend error: ${uploadResult.status}`);
    }

    const payload = JSON.parse(uploadResult.body) as SttBackendResponse;
    const text =
      payload.text ??
      payload.transcript ??
      payload.result ??
      payload.data?.text ??
      "";

    return String(text).trim();
  } catch (error) {
    console.log("[STTService] transcribeAudio failed", error);
    throw error;
  }
}
