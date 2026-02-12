import * as avatarRepo from '../avatars.repository.ts';

export const getAllPublicCatalog = () => {
  return avatarRepo.fetchPublicAvatarsRepo();
};
