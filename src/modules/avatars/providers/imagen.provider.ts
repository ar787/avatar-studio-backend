import { GoogleGenAI } from '@google/genai';

import * as fs from 'node:fs';
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

  if (!response.generatedImages) return;

  let idx = 1;
  for (const generatedImage of response.generatedImages) {
    let imgBytes = generatedImage?.image?.imageBytes;
    const buffer = Buffer.from(imgBytes, 'base64');
    fs.writeFileSync(`imagen-${idx}.png`, buffer);
    idx++;
  }
};
