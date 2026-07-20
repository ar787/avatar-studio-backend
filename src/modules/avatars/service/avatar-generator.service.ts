import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

import {
  InternalServerError,
  NotFoundError,
} from '@/utils/errors/ApiErrors.js';
import { imagenAPI } from '../providers/imagen.provider.js';
import * as avatarRepo from '../avatars.repository.js';
import * as avatarSharedService from './avatar-shared.service.js';
import * as userService from '@/modules/users/service/user.service.js';
import config from '@/config/config.js';
import type { PresetType } from '../types.js';
import { STYLE_TEMPLATES } from '../avatars.utils.js';

type StyleTemplate = keyof typeof STYLE_TEMPLATES;

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

export const uploadEditedAvatar = async (
  userId: string,
  avatarId: string,
  file: Express.Multer.File,
  adjustments?: Record<string, number>,
  preset?: PresetType,
) => {
  const avatar = await avatarRepo.getAvatarById(avatarId, userId);
  if (avatar === undefined) {
    throw new NotFoundError(`avatar not found with id: ${avatarId}`);
  }

  const remainingCredits = await userService.deductCredits(userId, 1);

  try {
    const downloadToken = uuidv4();
    const name = `image-${Date.now()}-edited`;
    const storagePath = `users/${userId}/generated-avatars/${name}.${avatar.extension}`;
    await avatarRepo.uploadImage(storagePath, file, downloadToken);

    const url = avatarRepo.getPermanentUrl(
      config.firebaseStorageBucket,
      encodeURIComponent(storagePath),
      downloadToken,
    );

    const imageDoc = {
      url,
      storagePath,
      extension: avatar.extension,
      prompt: avatar.prompt,
      createdAt: FieldValue.serverTimestamp(),
      ...(adjustments !== undefined && { adjustments }),
      ...(preset !== undefined && { preset }),
    };
    const newAvatarId = await avatarRepo.addImageToLibrary(userId, imageDoc);

    return {
      avatar: {
        avatarId: newAvatarId,
        url,
        prompt: avatar.prompt,
        extension: avatar.extension,
        ...(adjustments !== undefined && { adjustments }),
        ...(preset !== undefined && { preset }),
      },
      remainingCredits,
    };
  } catch (error) {
    await userService.addCredits(userId, 1);
    throw error;
  }
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
