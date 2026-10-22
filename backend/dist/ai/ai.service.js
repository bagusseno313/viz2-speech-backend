"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const CAPTION_TEMPLATES = {
    document: 'Dokumen ini berisi teks yang dapat dibaca, dengan judul, paragraf utama, dan informasi penting yang ditonjolkan.',
    people: 'Pada gambar terlihat seorang individu dengan ekspresi dan penampilan yang dapat dijelaskan secara ringkas.',
    environment: 'Lingkungan sekitar menunjukkan area yang ramai dengan benda utama dan konteks ruang yang jelas.',
    simple: 'Ada objek utama di depan kamera dengan bentuk dan letaknya yang mudah dikenali.',
    detail: 'Gambar menunjukkan komposisi visual yang kaya detail, termasuk objek utama, latar belakang, dan konteks sekitar.',
};
let AiService = class AiService {
    normalizeMode(mode) {
        const key = String(mode ?? 'detail').toLowerCase();
        if (key in CAPTION_TEMPLATES) {
            return key;
        }
        return 'detail';
    }
    async callOllamaVision(prompt, imageBase64) {
        const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
        const model = process.env.VISION_MODEL ?? 'qwen2.5vl:7b';
        const response = await axios_1.default.post(`${baseUrl}/api/generate`, {
            model,
            prompt,
            images: [imageBase64],
            stream: false,
        });
        return String(response.data?.response ?? '').trim();
    }
    async callOllamaText(prompt) {
        const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
        const model = process.env.VISION_MODEL ?? 'qwen2.5vl:7b';
        const response = await axios_1.default.post(`${baseUrl}/api/generate`, {
            model,
            prompt,
            stream: false,
        });
        return String(response.data?.response ?? '').trim();
    }
    async generateCaption(mode, prompt, file) {
        const normalizedMode = this.normalizeMode(mode);
        const fallbackCaption = `${CAPTION_TEMPLATES[normalizedMode]}${prompt ? ` ${prompt}` : ''}`.trim();
        const useFakeAi = process.env.USE_FAKE_AI === 'true';
        const provider = process.env.AI_PROVIDER ?? 'mock';
        const model = process.env.VISION_MODEL ?? 'fallback-vision';
        if (useFakeAi || !provider || provider === 'mock') {
            return {
                caption: fallbackCaption,
                mode: normalizedMode,
                provider: 'mock',
                model: 'fallback-caption',
                fileName: file?.originalname ?? null,
            };
        }
        if (provider === 'ollama' && file?.buffer) {
            const imageBase64 = file.buffer.toString('base64');
            const systemPrompt = {
                document: 'Bacalah dokumen ini dan jelaskan isinya dengan ringkas namun jelas untuk pengguna tunanetra.',
                people: 'Deskripsikan orang yang terlihat dan aktivitasnya dengan bahasa yang sederhana.',
                environment: 'Deskripsikan lingkungan di sekitarnya, objek utama, dan kondisi ruang secara jelas.',
                simple: 'Berikan deskripsi singkat satu kalimat yang mudah dipahami.',
                detail: 'Berikan deskripsi visual yang kaya detail tapi tetap ringkas untuk dibacakan.',
            }[normalizedMode];
            const result = await this.callOllamaVision(`${systemPrompt} ${prompt ?? ''}`.trim(), imageBase64);
            return {
                caption: result || fallbackCaption,
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
    async answerVqa(question, caption, mode) {
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
    async synthesizeTts(text, language = 'id-ID') {
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
                const response = await axios_1.default.post(`${baseUrl}/tts`, {
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
            }
            catch {
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)()
], AiService);
//# sourceMappingURL=ai.service.js.map