import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
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

    // Do not drop short final words: Indonesian prepositions ("di", "ke")
    // and abbreviations ("AI", "3D") are valid caption endings.
    const normalized = cleaned.replace(/[\s.]+$/u, '').trim();

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
    mode: ModeKey,
  ): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = process.env.VISION_MODEL ?? 'qwen2.5vl:7b';
    // Ollama's default generation limit can be too restrictive for captions.
    // Document mode needs substantially more room for readable OCR output.
    const numPredict = mode === 'document' ? 2048 : mode === 'simple' ? 160 : 512;

    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        images: [imageBase64],
        stream: false,
        options: {
          num_predict: numPredict,
          temperature: 0.2,
        },
      },
      { timeout: 180_000 },
    );

    if (response.data?.done_reason === 'length') {
      console.warn(
        `[AiService] Vision caption reached num_predict limit (${numPredict}) for mode ${mode}.`,
      );
    }

    return String(response.data?.response ?? '').trim();
  }

  private async callPaddleOcr(file: UploadedImage): Promise<{
    text: string;
    model: string;
    language: string;
  }> {
    const baseUrl = (
      process.env.PADDLEOCR_BASE_URL ?? 'http://localhost:8002'
    ).replace(/\/+$/u, '');
    const model = process.env.PADDLEOCR_MODEL ?? 'PP-OCRv6';
    const language = process.env.PADDLEOCR_LANG ?? 'id';
    const timeoutMs = Number.parseInt(
      process.env.PADDLEOCR_TIMEOUT_MS ?? '180000',
      10,
    );

    if (!file.buffer?.length) {
      throw new BadGatewayException('Image buffer is empty for PaddleOCR.');
    }

    const formData = new FormData();
    const mimeType = file.mimetype ?? 'image/jpeg';
    const fileName = file.originalname ?? 'document.jpg';
    formData.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: mimeType }),
      fileName,
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/ocr`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(
          Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 180000,
        ),
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'TimeoutError'
      ) {
        throw new GatewayTimeoutException(
          'PaddleOCR processing timed out. Please try a clearer or smaller image.',
        );
      }

      console.error('[AiService] PaddleOCR request failed:', error);
      throw new ServiceUnavailableException(
        'PaddleOCR service is unavailable. Start the OCR service and try again.',
      );
    }

    if (!response.ok) {
      console.error(
        `[AiService] PaddleOCR returned HTTP ${response.status}.`,
      );
      throw new BadGatewayException(
        'PaddleOCR could not process this image. Please try again.',
      );
    }

    let payload: {
      text?: string;
      model?: string;
      language?: string;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new BadGatewayException(
        'PaddleOCR returned an invalid response.',
      );
    }

    // Keep line breaks because they represent the reading order and paragraph
    // boundaries detected by OCR. Only normalize whitespace inside each line.
    const text = String(payload.text ?? '')
      .replace(/\r\n?/gu, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/gu, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();

    return {
      text,
      model: payload.model ?? model,
      language: payload.language ?? language,
    };
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
    const ocrProvider = process.env.OCR_PROVIDER ?? 'paddleocr';

    // DOCUMENT mode uses real OCR rather than asking a vision model to
    // reproduce text. This preserves the exact recognized content and order.
    if (
      !useFakeAi &&
      normalizedMode === 'document' &&
      ocrProvider === 'paddleocr' &&
      file?.buffer
    ) {
      const ocrResult = await this.callPaddleOcr(file);
      const caption =
        ocrResult.text || 'Tidak ada teks yang dapat dikenali dari gambar ini.';

      return {
        caption,
        mode: normalizedMode,
        provider: 'paddleocr',
        model: ocrResult.model,
        fileName: file.originalname ?? null,
      };
    }

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
          'Bacalah seluruh teks yang terlihat pada dokumen. Pertahankan urutan bacaan dan jelaskan struktur dokumen dengan jelas. Jangan menghilangkan bagian teks yang terbaca.',
        people:
          'Deskripsikan orang yang terlihat, pakaian, posisi, ekspresi, dan aktivitas yang tampak. Gunakan 2 sampai 3 kalimat lengkap.',
        environment:
          'Deskripsikan lokasi atau lingkungan, objek utama, posisi antarobjek, dan kondisi sekitar. Gunakan 2 sampai 4 kalimat lengkap.',
        simple:
          'Berikan satu kalimat lengkap yang menjelaskan objek utama dan ciri paling penting yang terlihat.',
        detail:
          'Berikan deskripsi visual yang informatif untuk pengguna tunanetra dalam 3 sampai 5 kalimat lengkap. Jelaskan objek utama, ciri fisik, posisi, latar belakang, dan hubungan antarobjek yang benar-benar terlihat. Susun kalimat secara utuh dan natural.',
      }[normalizedMode];
      const completionInstruction =
        'PENTING: Tulis jawaban sampai selesai. Jangan memotong kata atau kalimat di tengah. Akhiri dengan tanda baca yang sesuai. Jangan mengarang detail yang tidak terlihat.';

      const result = await this.callOllamaVision(
        [systemPrompt, prompt, completionInstruction].filter(Boolean).join(' '),
        imageBase64,
        normalizedMode,
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
