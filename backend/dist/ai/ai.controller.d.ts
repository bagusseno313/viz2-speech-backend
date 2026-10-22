import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    health(): {
        status: string;
        service: string;
        timestamp: string;
    };
    generateCaption(file: any, body: {
        mode?: string;
        prompt?: string;
    }): Promise<{
        caption: string;
        mode: "document" | "people" | "environment" | "simple" | "detail";
        provider: string;
        model: string;
        fileName: string | null;
    }>;
    answerVqa(body: {
        question?: string;
        caption?: string;
        mode?: string;
    }): Promise<{
        question: string;
        answer: string;
        mode: string;
        provider: string;
    }>;
    synthesizeTts(body: {
        text?: string;
        language?: string;
    }): Promise<{
        text: string;
        language: string;
        provider: string;
        status: string;
        audioUrl: string | null;
    }>;
}
