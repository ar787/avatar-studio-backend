import { NotFoundError } from '../../../utils/errors/ApiErrors.js';
import * as avatarRepo from '../avatars.repository.js';

export const getAvatarStream = async (fileName: string, filePath: string) => {
  const exists = await avatarRepo.checkFileExists(filePath);

  if (!exists) {
    throw new NotFoundError(`Avatar '${fileName}' not found in storage.`);
  }

  const file = avatarRepo.getFileReference(filePath);

  return file.createReadStream();
};
