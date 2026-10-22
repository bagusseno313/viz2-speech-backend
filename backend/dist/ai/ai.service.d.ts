type ModeKey = 'document' | 'people' | 'environment' | 'simple' | 'detail';
type UploadedImage = {
    originalname?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
    path?: string;
};
export declare class AiService {
    private normalizeMode;
    private callOllamaVision;
    private callOllamaText;
    generateCaption(mode: string, prompt?: string, file?: UploadedImage): Promise<{
        caption: string;
        mode: ModeKey;
        provider: string;
        model: string;
        fileName: string | null;
    }>;
    answerVqa(question: string, caption?: string, mode?: string): Promise<{
        question: string;
        answer: string;
        mode: string;
        provider: string;
    }>;
    synthesizeTts(text: string, language?: string): Promise<{
        text: string;
        language: string;
        provider: string;
        status: string;
        audioUrl: string | null;
    }>;
}
export {};
