import { bucket } from '../../../config/firebase.ts';
import { InternalServerError } from '../../../utils/errors/ApiErrors.ts';
import { imagenAPI } from '../providers/imagen.provider.ts';

export const generateImages = async (prompt: string) => {
  const imageBuffers = await imagenAPI(buildAvatarPrompt(prompt));
  if (imageBuffers.length === 0) {
    throw new InternalServerError('AI failed to generate images');
  }

  const uploadPromises = imageBuffers.map((buffer, idx) => {
    const filename = `generated-avatars/imagen-${Date.now()}-${idx}.png`;
    const file = bucket.file(filename);

    return file.save(buffer, { contentType: 'image/png' });
  });

  await Promise.all(uploadPromises);

  return { message: 'Images generated and stored successfully' };
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
