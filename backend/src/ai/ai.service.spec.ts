import { AiService } from './ai.service';

describe('AiService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.WHISPER_BASE_URL;
    delete process.env.WHISPER_MODEL;
    delete process.env.WHISPER_PROVIDER;
    delete process.env.AI_PROVIDER;
    delete process.env.OCR_PROVIDER;
    delete process.env.USE_FAKE_AI;
    delete process.env.PADDLEOCR_BASE_URL;
    delete process.env.PADDLEOCR_MODEL;
    delete process.env.PADDLEOCR_LANG;
    delete process.env.PADDLEOCR_TIMEOUT_MS;
  });

  it.each([
    ['Objek berada di', 'Objek berada di.'],
    ['Informasi tambahan ke', 'Informasi tambahan ke.'],
    ['Sistem menggunakan AI', 'Sistem menggunakan AI.'],
    ['Keyboard memiliki koneksi 3D', 'Keyboard memiliki koneksi 3D.'],
  ])('preserves valid short caption endings: %s', (rawCaption, expected) => {
    expect(AiService.sanitizeCaption(rawCaption)).toBe(expected);
  });

  it('uses PaddleOCR text for document mode and preserves line breaks', async () => {
    process.env.USE_FAKE_AI = 'false';
    process.env.AI_PROVIDER = 'ollama';
    process.env.OCR_PROVIDER = 'paddleocr';
    process.env.PADDLEOCR_BASE_URL = 'http://localhost:8002';
    process.env.PADDLEOCR_MODEL = 'PP-OCRv6';
    process.env.PADDLEOCR_LANG = 'id';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        text: 'SURAT KETERANGAN\\nNama: Budi\\nAlamat: Surakarta',
        model: 'PP-OCRv6',
        language: 'id',
      }),
    }) as any;

    const result = await new AiService().generateCaption(
      'document',
      'Baca dokumen ini.',
      {
        originalname: 'document.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image-bytes'),
      },
    );

    expect(result).toMatchObject({
      caption: 'SURAT KETERANGAN\\nNama: Budi\\nAlamat: Surakarta',
      mode: 'document',
      provider: 'paddleocr',
      model: 'PP-OCRv6',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8002/ocr',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('transcribes audio using the whisper backend when the local service is available', async () => {
    process.env.WHISPER_BASE_URL = 'http://localhost:8001';
    process.env.WHISPER_MODEL = 'base';
    process.env.WHISPER_PROVIDER = 'whisper';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Halo dunia' }),
    }) as any;

    const result = await new AiService().transcribeAudio({
      originalname: 'sample.wav',
      mimetype: 'audio/wav',
      buffer: Buffer.from('audio-bytes'),
    });

    expect(result).toMatchObject({
      text: 'Halo dunia',
      provider: 'whisper',
      status: 'completed',
      model: 'base',
    });
  });
});
