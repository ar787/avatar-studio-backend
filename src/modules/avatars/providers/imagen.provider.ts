import { GoogleGenAI } from '@google/genai';

import config from '../../../config/config.ts';

export const imagenAPI = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
    },
  });

  if (!response.generatedImages) return [];

  return response.generatedImages.map((img) =>
    Buffer.from(img.image?.imageBytes as string, 'base64'),
  );
};
