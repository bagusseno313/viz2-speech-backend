"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const ai_service_1 = require("./ai.service");
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    health() {
        return {
            status: 'ok',
            service: 'viz2speech-ai',
            timestamp: new Date().toISOString(),
        };
    }
    async generateCaption(file, body) {
        console.debug('Generating caption...', file);
        if (!file) {
            throw new common_1.BadRequestException('Image file is required in field "image".');
        }
        if (file.mimetype === 'text/plain' ||
            file.buffer?.toString('utf8').includes('File not found')) {
            throw new common_1.BadRequestException('Invalid image upload received from client.');
        }
        return this.aiService.generateCaption(body.mode ?? 'detail', body.prompt ?? 'Jelaskan gambar ini untuk pengguna tunanetra.', file);
    }
    async transcribeAudio(file) {
        console.debug('Transcribing audio...', file);
        if (!file) {
            throw new common_1.BadRequestException('Audio file is required in field "audio".');
        }
        return this.aiService.transcribeAudio(file);
    }
    async answerVqa(body) {
        if (!body.question || !body.question.trim()) {
            throw new common_1.BadRequestException('Question is required.');
        }
        return this.aiService.answerVqa(body.question, body.caption, body.mode ?? 'detail');
    }
    async synthesizeTts(body) {
        if (!body.text || !body.text.trim()) {
            throw new common_1.BadRequestException('Text is required.');
        }
        return this.aiService.synthesizeTts(body.text, body.language ?? 'id-ID');
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('caption'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (_req, file, callback) => {
            const isImage = file?.mimetype?.startsWith('image/');
            if (!isImage) {
                return callback(new common_1.BadRequestException('Uploaded file must be an image file.'), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateCaption", null);
__decorate([
    (0, common_1.Post)('stt'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('audio', {
        limits: {
            fileSize: 20 * 1024 * 1024,
        },
        fileFilter: (_req, file, callback) => {
            const isAudio = file?.mimetype?.startsWith('audio/') ||
                /\.(wav|mp3|m4a|aac|ogg)$/i.test(file?.originalname ?? '');
            if (!isAudio) {
                return callback(new common_1.BadRequestException('Uploaded file must be an audio file.'), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "transcribeAudio", null);
__decorate([
    (0, common_1.Post)('vqa'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "answerVqa", null);
__decorate([
    (0, common_1.Post)('tts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "synthesizeTts", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map