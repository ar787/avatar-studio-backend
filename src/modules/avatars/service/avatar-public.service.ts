import * as avatarRepo from '../avatars.repository.ts';

export const getAllPublicCatalog = () => {
  return avatarRepo.fetchPublicAvatarsRepo();
};

export const getAvatarStream = async (fileName: string) => {
  const filePath = `avatars/${fileName}`;
  const exists = await avatarRepo.checkFileExists(filePath);

  if (!exists) {
    throw new Error('image not found');
  }

  const file = avatarRepo.getFileReference(filePath);

  return file.createReadStream();
};
