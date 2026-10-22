import { Injectable } from '@nestjs/common';
import axios from 'axios';

type ModeKey = 'document' | 'people' | 'environment' | 'simple' | 'detail';

type UploadedImage = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
  path?: string;
};

const CAPTION_TEMPLATES: Record<ModeKey, string> = {
  document:
    'Dokumen ini berisi teks yang dapat dibaca, dengan judul, paragraf utama, dan informasi penting yang ditonjolkan.',
  people:
    'Pada gambar terlihat seorang individu dengan ekspresi dan penampilan yang dapat dijelaskan secara ringkas.',
  environment:
    'Lingkungan sekitar menunjukkan area yang ramai dengan benda utama dan konteks ruang yang jelas.',
  simple:
    'Ada objek utama di depan kamera dengan bentuk dan letaknya yang mudah dikenali.',
  detail:
    'Gambar menunjukkan komposisi visual yang kaya detail, termasuk objek utama, latar belakang, dan konteks sekitar.',
};

@Injectable()
export class AiService {
  static sanitizeCaption(value?: string | null): string {
    const cleaned = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return '';
    }

    const withoutTrailingNoise = cleaned.replace(
      /\s+[A-Za-z0-9]{1,2}\s*$/u,
      '',
    );
    const normalized = withoutTrailingNoise.replace(/[\s.]+$/u, '').trim();

    if (!normalized) {
      return '';
    }

    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  }

  private normalizeMode(mode?: string): ModeKey {
    const key = String(mode ?? 'detail').toLowerCase();
    if (key in CAPTION_TEMPLATES) {
      return key as ModeKey;
    }

    return 'detail';
  }

  private async callOllamaVision(
    prompt: string,
    imageBase64: string,
  ): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = process.env.VISION_MODEL ?? 'qwen2.5vl:7b';

    const response = await axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt,
      images: [imageBase64],
      stream: false,
    });

    return String(response.data?.response ?? '').trim();
  }

  private async callOllamaText(prompt: string): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = process.env.VISION_MODEL ?? 'qwen2.5vl:7b';

    const response = await axios.post(`${baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
    });

    return String(response.data?.response ?? '').trim();
  }

  private async callWhisperTranscription(file: UploadedImage): Promise<string> {
    const baseUrl = process.env.WHISPER_BASE_URL ?? 'http://localhost:8001';
    const model = process.env.WHISPER_MODEL ?? 'base';
    const audioBuffer = file.buffer ?? Buffer.alloc(0);
    const mimeType = file.mimetype ?? 'audio/wav';
    const fileName = file.originalname ?? 'audio.wav';

    const endpoints = [
      `${baseUrl}/v1/audio/transcriptions`,
      `${baseUrl}/asr`,
      `${baseUrl}/transcribe`,
    ];

    for (const endpoint of endpoints) {
      try {
        const formData = new FormData();
        const audioPart = new Uint8Array(audioBuffer);
        formData.append(
          'file',
          new Blob([audioPart], { type: mimeType }),
          fileName,
        );
        formData.append('model', model);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as {
          text?: string;
          transcript?: string;
          result?: string;
          data?: { text?: string };
        };

        const transcript =
          payload.text ??
          payload.transcript ??
          payload.result ??
          payload.data?.text ??
          '';

        if (transcript.trim()) {
          return transcript.trim();
        }
      } catch {
        // try the next standard whisper endpoint
      }
    }

    return '';
  }

  async transcribeAudio(file?: UploadedImage): Promise<{
    text: string;
    provider: string;
    status: string;
    model: string;
    fileName: string | null;
  }> {
    const useFakeAi = process.env.USE_FAKE_AI === 'true';
    const provider = process.env.WHISPER_PROVIDER ?? 'whisper';
    const model = process.env.WHISPER_MODEL ?? 'base';

    if (useFakeAi || !provider || provider === 'mock') {
      return {
        text: '',
        provider: 'mock',
        status: 'skipped',
        model,
        fileName: file?.originalname ?? null,
      };
    }

    if (provider === 'whisper') {
      const transcript = await this.callWhisperTranscription(file ?? {});
      const text = transcript.trim();

      return {
        text,
        provider,
        status: text ? 'completed' : 'empty',
        model,
        fileName: file?.originalname ?? null,
      };
    }

    return {
      text: '',
      provider,
      status: 'unsupported',
      model,
      fileName: file?.originalname ?? null,
    };
  }

  async generateCaption(
    mode: string,
    prompt?: string,
    file?: UploadedImage,
  ): Promise<{
    caption: string;
    mode: ModeKey;
    provider: string;
    model: string;
    fileName: string | null;
  }> {
    const normalizedMode = this.normalizeMode(mode);
    const fallbackCaption =
      `${CAPTION_TEMPLATES[normalizedMode]}${prompt ? ` ${prompt}` : ''}`.trim();

    const useFakeAi = process.env.USE_FAKE_AI === 'true';
    const provider = process.env.AI_PROVIDER ?? 'mock';
    const model = process.env.VISION_MODEL ?? 'fallback-vision';

    if (useFakeAi || !provider || provider === 'mock') {
      return {
        caption: AiService.sanitizeCaption(fallbackCaption),
        mode: normalizedMode,
        provider: 'mock',
        model: 'fallback-caption',
        fileName: file?.originalname ?? null,
      };
    }

    if (provider === 'ollama' && file?.buffer) {
      const imageBase64 = file.buffer.toString('base64');
      const systemPrompt = {
        document:
          'Bacalah dokumen ini dan jelaskan isinya dengan ringkas namun jelas untuk pengguna tunanetra.',
        people:
          'Deskripsikan orang yang terlihat dan aktivitasnya dengan bahasa yang sederhana.',
        environment:
          'Deskripsikan lingkungan di sekitarnya, objek utama, dan kondisi ruang secara jelas.',
        simple: 'Berikan deskripsi singkat satu kalimat yang mudah dipahami.',
        detail:
          'Berikan deskripsi visual yang kaya detail tapi tetap ringkas untuk dibacakan.',
      }[normalizedMode];

      const result = await this.callOllamaVision(
        `${systemPrompt} ${prompt ?? ''}`.trim(),
        imageBase64,
      );

      const caption = AiService.sanitizeCaption(result || fallbackCaption);

      return {
        caption: caption || AiService.sanitizeCaption(fallbackCaption),
        mode: normalizedMode,
        provider,
        model,
        fileName: file.originalname ?? null,
      };
    }

    return {
      caption: fallbackCaption,
      mode: normalizedMode,
      provider,
      model,
      fileName: file?.originalname ?? null,
    };
  }

  async answerVqa(
    question: string,
    caption?: string,
    mode?: string,
  ): Promise<{
    question: string;
    answer: string;
    mode: string;
    provider: string;
  }> {
    const normalizedMode = this.normalizeMode(mode);
    const useFakeAi = process.env.USE_FAKE_AI === 'true';
    const provider = process.env.AI_PROVIDER ?? 'mock';

    if (useFakeAi || !provider || provider === 'mock') {
      const baseContext = caption?.trim()
        ? `Berdasarkan konteks gambar: ${caption}. `
        : '';
      const fakeAnswer = `${baseContext}Jawaban untuk pertanyaan "${question}" adalah bahwa objek utama terlihat jelas dan sesuai konteks visual yang telah dijelaskan sebelumnya.`;

      return {
        question,
        answer: fakeAnswer,
        mode: normalizedMode,
        provider: 'mock',
      };
    }

    if (provider === 'ollama') {
      const prompt = `Jawablah pertanyaan berikut berdasarkan konteks gambar dan deskripsi sebelumnya. Pertanyaan: ${question}. Konteks: ${caption ?? 'Tidak ada konteks tambahan.'}`;
      const answer = await this.callOllamaText(prompt);

      return {
        question,
        answer: answer || 'Saya tidak dapat menjawab pertanyaan saat ini.',
        mode: normalizedMode,
        provider,
      };
    }

    return {
      question,
      answer: 'Provider AI lokal belum tersedia.',
      mode: normalizedMode,
      provider,
    };
  }

  async synthesizeTts(
    text: string,
    language = 'id-ID',
  ): Promise<{
    text: string;
    language: string;
    provider: string;
    status: string;
    audioUrl: string | null;
  }> {
    const useFakeAi = process.env.USE_FAKE_AI === 'true';
    const provider = process.env.TTS_PROVIDER ?? 'mock';

    if (useFakeAi || !provider || provider === 'mock') {
      return {
        text,
        language,
        provider: 'mock',
        status: 'queued',
        audioUrl: null,
      };
    }

    if (provider === 'piper') {
      const baseUrl = process.env.PIPER_BASE_URL ?? 'http://localhost:10200';
      try {
        const response = await axios.post(`${baseUrl}/tts`, {
          text,
          language,
        });

        return {
          text,
          language,
          provider,
          status: response.data?.status ?? 'queued',
          audioUrl: response.data?.audioUrl ?? null,
        };
      } catch {
        return {
          text,
          language,
          provider,
          status: 'queued',
          audioUrl: null,
        };
      }
    }

    return {
      text,
      language,
      provider,
      status: 'queued',
      audioUrl: null,
    };
  }
}
