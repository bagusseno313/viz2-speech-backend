import { AiService } from './ai.service';

describe('AiService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.WHISPER_BASE_URL;
    delete process.env.WHISPER_MODEL;
    delete process.env.WHISPER_PROVIDER;
  });

  it.each([
    ['Objek berada di', 'Objek berada di.'],
    ['Informasi tambahan ke', 'Informasi tambahan ke.'],
    ['Sistem menggunakan AI', 'Sistem menggunakan AI.'],
    ['Keyboard memiliki koneksi 3D', 'Keyboard memiliki koneksi 3D.'],
  ])('preserves valid short caption endings: %s', (rawCaption, expected) => {
    expect(AiService.sanitizeCaption(rawCaption)).toBe(expected);
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
