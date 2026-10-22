import { VQA_SAMPLE_ANSWER } from "../data/content";
import { AI_CONFIG } from "./aiConfig";

interface FollowUpBackendResponse {
  question?: string;
  answer?: string;
  text?: string;
}

/**
 * Real VQA flow backed by a remote AI endpoint.
 *
 * Expected backend contract:
 *   POST /api/vqa
 *   JSON body:
 *   {
 *     "question": "...",
 *     "caption": "...",
 *     "mode": "environment"
 *   }
 *
 * If the AI endpoint is not configured yet, we keep the previous safe fallback so
 * the screen still behaves predictably during UI demos or proposal work.
 */
export async function askFollowUp(
  question: string,
  lastCaption?: string,
  mode?: string,
): Promise<{ question: string; answer: string }> {
  if (
    !question ||
    typeof process === "undefined" ||
    process.env.EXPO_PUBLIC_AI_API_URL === undefined ||
    process.env.EXPO_PUBLIC_USE_FAKE_AI === "true"
  ) {
    return { question, answer: VQA_SAMPLE_ANSWER };
  }

  const response = await fetch(
    `${AI_CONFIG.apiBaseUrl}${AI_CONFIG.endpoints.vqa}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        question,
        caption: lastCaption ?? "",
        mode: mode ?? "detail",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`VQA backend error: ${response.status}`);
  }

  const payload = (await response.json()) as FollowUpBackendResponse;
  return {
    question,
    answer:
      payload.answer ??
      payload.text ??
      `${VQA_SAMPLE_ANSWER} ${lastCaption ?? ""}`.trim(),
  };
}
