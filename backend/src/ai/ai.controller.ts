import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('api')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'viz2speech-ai',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('caption')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const isImage = file?.mimetype?.startsWith('image/');
        if (!isImage) {
          return callback(
            new BadRequestException('Uploaded file must be an image file.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async generateCaption(
    @UploadedFile() file: any,
    @Body() body: { mode?: string; prompt?: string },
  ) {
    console.debug('Generating caption...', file);

    if (!file) {
      throw new BadRequestException('Image file is required in field "image".');
    }

    if (
      file.mimetype === 'text/plain' ||
      file.buffer?.toString('utf8').includes('File not found')
    ) {
      throw new BadRequestException(
        'Invalid image upload received from client.',
      );
    }

    return this.aiService.generateCaption(
      body.mode ?? 'detail',
      body.prompt ?? 'Jelaskan gambar ini untuk pengguna tunanetra.',
      file,
    );
  }

  @Post('stt')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const isAudio =
          file?.mimetype?.startsWith('audio/') ||
          /\.(wav|mp3|m4a|aac|ogg)$/i.test(file?.originalname ?? '');

        if (!isAudio) {
          return callback(
            new BadRequestException('Uploaded file must be an audio file.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async transcribeAudio(@UploadedFile() file: any) {
    console.debug('Transcribing audio...', file);

    if (!file) {
      throw new BadRequestException('Audio file is required in field "audio".');
    }

    return this.aiService.transcribeAudio(file);
  }

  @Post('vqa')
  async answerVqa(
    @Body()
    body: {
      question?: string;
      caption?: string;
      mode?: string;
    },
  ) {
    if (!body.question || !body.question.trim()) {
      throw new BadRequestException('Question is required.');
    }

    return this.aiService.answerVqa(
      body.question,
      body.caption,
      body.mode ?? 'detail',
    );
  }

  @Post('tts')
  async synthesizeTts(@Body() body: { text?: string; language?: string }) {
    if (!body.text || !body.text.trim()) {
      throw new BadRequestException('Text is required.');
    }

    return this.aiService.synthesizeTts(body.text, body.language ?? 'id-ID');
  }
}
