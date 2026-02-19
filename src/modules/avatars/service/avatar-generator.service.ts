import { imagenAPI } from '../providers/imagen.provider.ts';

export const generateImages = async () => {
  await imagenAPI('The old man holding a red hammer');
  return 'image has created successfully';
};
