import { AiService } from './ai.service';

describe('AiService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.WHISPER_BASE_URL;
    delete process.env.WHISPER_MODEL;
    delete process.env.WHISPER_PROVIDER;
  });

  it('drops incomplete trailing fragments from generated captions', () => {
    const rawCaption =
      'Ada objek utama di depan kamera dengan bentuk dan letaknya yang mudah dikenali. A';

    expect(AiService.sanitizeCaption(rawCaption)).toBe(
      'Ada objek utama di depan kamera dengan bentuk dan letaknya yang mudah dikenali.',
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
