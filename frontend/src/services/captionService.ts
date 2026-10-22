import * as FileSystem from "expo-file-system/legacy";
import { ModeKey } from "../data/modes";
import { SAMPLE_CAPTIONS } from "../data/content";
import { AI_CONFIG } from "./aiConfig";

interface CaptionBackendResponse {
  caption?: string;
  text?: string;
  description?: string;
  summary?: string;
}

async function imageUriToBlob(
  photoUri: string,
  mimeType: string,
): Promise<Blob> {
  // 1. Read file directly as a Base64 string from Expo FileSystem
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2. Format a data URI string instead of creating a Uint8Array
  const dataUri = `data:${mimeType};base64,${base64}`;

  // 3. Let React Native's native fetch parse it safely into a supported Blob
  const response = await fetch(dataUri);
  return await response.blob();
}

export async function generateCaption(
  mode: ModeKey,
  photoUri?: string,
): Promise<string> {
  const envUrl = process.env.EXPO_PUBLIC_AI_API_URL;
  const envUseFakeAi = process.env.EXPO_PUBLIC_USE_FAKE_AI;
  const wantFallback =
    !photoUri ||
    typeof process === "undefined" ||
    envUrl === undefined ||
    envUseFakeAi === "true";

  console.log("[CaptionService] generateCaption start", {
    mode,
    photoUri,
    envUrl,
    envUseFakeAi,
    aiBaseUrl: AI_CONFIG.apiBaseUrl,
    wantFallback,
  });

  if (wantFallback) {
    console.log("[CaptionService] using sample caption fallback", {
      reason: !photoUri
        ? "missing-photo"
        : envUrl === undefined
          ? "missing-env"
          : "fake-ai-enabled",
    });
    return SAMPLE_CAPTIONS[mode];
  }

  const endpoint = `${AI_CONFIG.apiBaseUrl}${AI_CONFIG.endpoints.caption}`;

  const formData = new FormData();
  formData.append("mode", mode);
  formData.append("prompt", AI_CONFIG.modePrompt[mode]);

  const extension = photoUri.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const mimeType = extension === "png" ? "image/png" : "image/jpeg";
  const fileName = `caption-${Date.now()}.${extension}`;

  // 2. Pass this custom file object directly to FormData instead of a Blob
  formData.append("image", {
    uri: photoUri,
    name: fileName,
    type: mimeType,
  } as any); // Cast as 'any' to bypass strict TypeScript FormData definitions

  console.log("[CaptionService] sending caption request", {
    endpoint,
    mode,
    photoUri,
    imageName: fileName,
    mimeType,
  });

  try {
    // Use uploadAsync to stream the file natively
    const uploadResult = await FileSystem.uploadAsync(endpoint, photoUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "image",
      mimeType: mimeType,
      parameters: {
        mode: mode,
        prompt: AI_CONFIG.modePrompt[mode],
      },
      headers: {
        Accept: "application/json",
      },
    });

    if (uploadResult.status !== 200 && uploadResult.status !== 201) {
      console.log("[CaptionService] backend error", {
        status: uploadResult.status,
        body: uploadResult.body,
      });
      throw new Error(`Caption backend error: ${uploadResult.status}`);
    }

    const payload = JSON.parse(uploadResult.body) as CaptionBackendResponse;
    console.log("[CaptionService] success", payload);
    return (
      payload.caption ??
      payload.text ??
      payload.description ??
      payload.summary ??
      SAMPLE_CAPTIONS[mode]
    );
  } catch (error) {
    console.log("[CaptionService] fetch failed", error);
    throw error;
  }
}
