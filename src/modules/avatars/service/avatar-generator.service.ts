import { InternalServerError } from '../../../utils/errors/ApiErrors.js';
import { imagenAPI } from '../providers/imagen.provider.js';
import * as avatarRepo from '../avatars.repository.js';
import * as avatarSharedService from './avatar-shared.service.js';
import * as userService from '../../users/service/user.service.js';
import { FieldValue } from 'firebase-admin/firestore';

export const generateImages = async (prompt: string, userId: string) => {
  const remainingCredits = await userService.deductCredits(userId, 1);

  try {
    const imageBuffers = await imagenAPI(buildAvatarPrompt(prompt));

    if (imageBuffers.length === 0) {
      throw new InternalServerError('AI failed to generate images');
    }

    const uploadPromises = imageBuffers.map(async (buffer, idx) => {
      const name = `image-${Date.now()}-${idx}`;
      const extension = 'png';
      const storagePath = `users/${userId}/generated-avatars/${name}.${extension}`;
      const file = avatarRepo.getFileReference(storagePath);
      const imageUrl = file.publicUrl();

      await file.save(buffer, {
        contentType: 'image/png',
        metadata: {
          contentType: 'image/png',
          contentDisposition: 'inline',
        },
      });
      await avatarRepo.addImageToLibrary(userId, {
        url: imageUrl,
        storagePath,
        extension,
        prompt,
        createdAt: FieldValue.serverTimestamp(),
      });
      return imageUrl;
    });

    const generatedUrls = await Promise.all(uploadPromises);

    return {
      data: {
        generatedAvatarUrls: generatedUrls,
        remainingCredits,
      },
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

function buildAvatarPrompt(userInput: string) {
  return `
Professional avatar portrait.

Subject:
${userInput}

Composition:
- Head and shoulders only
- Centered framing
- Facing camera
- Symmetrical composition
- 1:1 aspect ratio

Style:
- Sharp focus


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
`;
}
