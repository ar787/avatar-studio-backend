import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

import { InternalServerError } from '@/utils/errors/ApiErrors.js';
import { imagenAPI } from '../providers/imagen.provider.js';
import * as avatarRepo from '../avatars.repository.js';
import * as avatarSharedService from './avatar-shared.service.js';
import * as userService from '@/modules/users/service/user.service.js';
import config from '@/config/config.js';

export const STYLE_TEMPLATES = {
  none: ['- Sharp focus'].join('\n'),
  anime: [
    '- Anime illustration style',
    '- Bold outlines',
    '- Vibrant flat colors',
    '- Expressive stylized features',
  ].join('\n'),
  simpsons: [
    '- 1990s prime-time animated sitcom style',
    '- Bright yellow skin tone',
    '- Distinct round bulging eyes and a prominent overbite',
    '- Clean linework with flat, bold colors',
    '- 2D animation cel aesthetic',
  ].join('\n'),
  soviet: [
    '- Vintage Soviet propaganda poster aesthetic',
    '- Heroic and stoic expression',
    '- Bold graphic style with sharp, geometric shapes and high contrast',
    '- Limited color palette dominated by deep red, gold, and dark tones',
    '- Subtle screen-printed texture on aged, weathered paper',
  ].join('\n'),
  oilPainting: [
    '- Classical oil painting portrait in the style of the Old Masters',
    '- Rich, deep colors with smooth brushwork and subtle impasto texture',
    '- Dramatic chiaroscuro lighting with warm golden tones',
    '- Fine craquelure and painterly canvas depth',
  ].join('\n'),
} as const;

export type StyleTemplate = keyof typeof STYLE_TEMPLATES;

export const generateImages = async (
  prompt: string,
  userId: string,
  style?: StyleTemplate,
) => {
  const remainingCredits = await userService.deductCredits(userId, 1);

  try {
    const imageBuffers = await imagenAPI(buildAvatarPrompt(prompt, style));

    if (imageBuffers.length === 0) {
      throw new InternalServerError('AI failed to generate images');
    }

    const uploadPromises = imageBuffers.map(async (buffer, idx) => {
      const name = `image-${Date.now()}-${idx}`;
      const extension = 'png';
      const storagePath = `users/${userId}/generated-avatars/${name}.${extension}`;
      const file = avatarRepo.getFileReference(storagePath);
      const downloadToken = uuidv4();
      const bucketName = config.firebaseStorageBucket;
      const encodedPath = encodeURIComponent(storagePath);

      const url = avatarRepo.getPermanentUrl(
        bucketName,
        encodedPath,
        downloadToken,
      );

      await file.save(buffer, {
        resumable: false,
        contentType: 'image/png',
        metadata: {
          contentType: 'image/png',
          contentDisposition: 'inline',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      });

      await avatarRepo.addImageToLibrary(userId, {
        url,
        storagePath,
        extension,
        prompt,
        createdAt: FieldValue.serverTimestamp(),
      });

      return url;
    });

    const generatedUrls = await Promise.all(uploadPromises);

    return {
      generatedAvatarUrls: generatedUrls,
      remainingCredits,
      message: 'Images generated and stored successfully',
    };
  } catch (error) {
    await userService.addCredits(userId, 1);
    throw error;
  }
};

export const getGeneratedAvatars = async (userId: string) => {
  return avatarRepo.fetchGeneratedAvatars(userId);
};

export const getAvatarStream = (userId: string, fileName: string) => {
  const filePath = `users/${userId}/generated-avatars/${fileName}`;
  return avatarSharedService.getAvatarStream(fileName, filePath);
};

function buildAvatarPrompt(userInput: string, style?: StyleTemplate) {
  const styleLines = STYLE_TEMPLATES[style ?? 'none'];

  return `
Professional avatar portrait.

Subject:
${userInput}

Composition:
- Head and shoulders only
- Close-up portrait crop
- Centered framing
- Facing camera
- Symmetrical composition
- 1:1 aspect ratio filling the entire frame completely edge-to-edge

Style:
${styleLines}

Background:
- Minimal
- Soft gradient or solid color
- No objects

Restrictions:
- No text
- No watermark
- No logo
- No extra people
- No cropped head
- No white borders, letterboxing, pillarboxing, or empty margins on the sides
`;
}
