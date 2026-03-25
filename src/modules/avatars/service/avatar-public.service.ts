import * as avatarRepo from '../avatars.repository.js';
import * as avatarSharedService from './avatar-shared.service.js';

export const getAllPublicCatalog = () => {
  return avatarRepo.fetchPublicAvatarsRepo();
};

export const getAvatarStream = (fileName: string) => {
  const filePath = `avatars/${fileName}`;
  return avatarSharedService.getAvatarStream(fileName, filePath);
};
