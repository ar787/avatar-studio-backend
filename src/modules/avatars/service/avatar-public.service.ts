import * as avatarRepo from '../avatars.repository.ts';
import * as avatarSharedService from './avatar-shared.service.ts';

export const getAllPublicCatalog = () => {
  return avatarRepo.fetchPublicAvatarsRepo();
};

export const getAvatarStream = (fileName: string) => {
  const filePath = `avatars/${fileName}`;
  return avatarSharedService.getAvatarStream(fileName, filePath);
};
