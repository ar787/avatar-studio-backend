import { imagenAPI } from '../providers/imagen.provider.ts';

export const generateImages = async () => {
  try {
    await imagenAPI('The old man holding a red hammer');
    return 'image has created successfully';
  } catch (error: any) {
    throw new Error(error.message);
  }
};
