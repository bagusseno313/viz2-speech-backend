const rawApiBaseUrl =
  process.env.EXPO_PUBLIC_AI_API_URL ?? "http://localhost:8000";

const normalizeApiBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "http://localhost:8000";

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  const hasExplicitPort = /:\d+/.test(withProtocol.replace(/^https?:\/\//, ""));
  if (!hasExplicitPort && !/\/[a-z]/i.test(withProtocol)) {
    return `${withProtocol}:8000`;
  }

  return withProtocol;
};

export const AI_CONFIG = {
  apiBaseUrl: normalizeApiBaseUrl(rawApiBaseUrl),
  endpoints: {
    caption: "/api/caption",
    stt: "/api/stt",
    vqa: "/api/vqa",
    tts: "/api/tts",
  },
  fallbackToSample: true,
  modePrompt: {
    document: "Baca dokumen ini dan jelaskan isinya dengan ringkas tapi jelas.",
    people: "Deskripsikan orang yang terlihat dalam gambar secara natural.",
    environment:
      "Deskripsikan lingkungan sekitar dan objek utama yang terlihat.",
    simple:
      "Berikan deskripsi singkat satu kalimat untuk kebutuhan pengguna buta.",
    detail: "Berikan deskripsi visual yang lebih rinci dan kaya detail.",
  },
} as const;
