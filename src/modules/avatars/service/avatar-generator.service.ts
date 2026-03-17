import { bucket, db } from '../../../config/firebase.ts';
import { InternalServerError } from '../../../utils/errors/ApiErrors.ts';
import { imagenAPI } from '../providers/imagen.provider.ts';
import * as avatarRepo from '../avatars.repository.ts';
import { FieldValue } from 'firebase-admin/firestore';

export const generateImages = async (prompt: string, userId: string) => {
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
    data: generatedUrls,
    message: 'Images generated and stored successfully',
  };
};

export const getGeneratedAvatars = async (userId: string) => {
  return avatarRepo.fetchGeneratedAvatars(userId);
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
