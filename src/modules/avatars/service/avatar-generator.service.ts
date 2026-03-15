import { bucket, db } from '../../../config/firebase.ts';
import { InternalServerError } from '../../../utils/errors/ApiErrors.ts';
import { imagenAPI } from '../providers/imagen.provider.ts';
import * as avatarRepo from '../avatars.repository.ts';

export const generateImages = async (prompt: string) => {
  const imageBuffers = await imagenAPI(buildAvatarPrompt(prompt));
  if (imageBuffers.length === 0) {
    throw new InternalServerError('AI failed to generate images');
  }

  const uploadPromises = imageBuffers.map(async (buffer, idx) => {
    const name = `imagen-${Date.now()}-${idx}`;
    const extension = 'png';
    const filename = `generated-avatars/${name}.${extension}`;
    const file = bucket.file(filename);
    const imageUrl = file.publicUrl();

    await file.save(buffer, { contentType: 'image/png' });
    await db.collection('generated-avatars').add({
      imageUrl: file.publicUrl(),
      name,
      extension,
    });

    return imageUrl;
  });

  const generatedUrls = await Promise.all(uploadPromises);

  return {
    data: generatedUrls,
    message: 'Images generated and stored successfully',
  };
};

export const getGeneratedAvatars = async () => {
  return avatarRepo.fetchGeneratedAvatars();
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
