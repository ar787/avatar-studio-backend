import { BadRequestError, NotFoundError } from '@/utils/errors/ApiErrors.js';
import * as albumsRepo from '../albums.repository.js';
import { getAvatarStream } from '@/modules/avatars/service/avatar-shared.service.js';
import type { Album, UpdateAlbumPayload } from '../types.js';
import type { PresetType } from '@/modules/avatars/types.js';

export const getUserAlbums = async (userId: string): Promise<Album[]> => {
  return albumsRepo.fetchUserAlbums(userId);
};

export const createAlbum = async (userId: string, name: string) => {
  return albumsRepo.createAlbumDoc(userId, {
    userId,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatarCount: 0,
  });
};

export const getAlbumById = async (albumId: string, userId: string) => {
  return albumsRepo.fetchAlbumById(albumId, userId);
};

export const getAlbumAvatars = async (albumId: string, userId: string) => {
  return albumsRepo.fetchAlbumAvatars(albumId, userId);
};

export const updateAlbum = async (
  albumId: string,
  userId: string,
  payload: UpdateAlbumPayload,
) => {
  const album = await albumsRepo.fetchAlbumById(albumId, userId);
  if (!album) {
    throw new NotFoundError('Album not found');
  }

  if (Object.keys(payload).length === 0) {
    throw new BadRequestError('At least one field must be provided to update');
  }

  if (payload.name !== undefined && !payload.name) {
    throw new BadRequestError('Album name cannot be empty');
  }

  await albumsRepo.updateAlbumDoc(albumId, userId, payload);
  return albumsRepo.fetchAlbumById(albumId, userId);
};

export const deleteAlbum = async (albumId: string, userId: string) => {
  const album = await albumsRepo.fetchAlbumById(albumId, userId);
  if (!album) {
    throw new NotFoundError('Album not found');
  }
  await albumsRepo.deleteAlbum(albumId, userId);
};

export const getAlbumAvatarStream = async (
  albumId: string,
  userId: string,
  avatarDocId: string,
) => {
  const [album, albumAvatar] = await Promise.all([
    albumsRepo.fetchAlbumById(albumId, userId),
    albumsRepo.fetchAlbumAvatarById(albumId, userId, avatarDocId),
  ]);
  if (!album) throw new NotFoundError('Album not found');
  if (!albumAvatar) throw new NotFoundError('Avatar not found in album');

  const generatedImage = await albumsRepo.fetchGeneratedImageById(
    userId,
    albumAvatar.avatarId,
  );
  if (!generatedImage) throw new NotFoundError('Original avatar not found');

  const filename = `avatar-${avatarDocId}.${generatedImage.extension}`;
  const stream = await getAvatarStream(filename, generatedImage.storagePath);
  return { stream, filename };
};

export const deleteAvatarFromAlbum = async (
  userId: string,
  albumId: string,
  avatarId: string,
) => {
  const [album, avatar] = await Promise.all([
    albumsRepo.fetchAlbumById(albumId, userId),
    albumsRepo.fetchAlbumAvatarById(albumId, userId, avatarId),
  ]);
  if (!album) throw new NotFoundError('Album not found');
  if (!avatar) throw new NotFoundError('Avatar not found in album');

  await albumsRepo.deleteAvatarFromAlbum(userId, albumId, avatarId);
};

export const addUploadedAvatarToAlbum = async (
  albumId: string,
  userId: string,
  avatar: {
    avatarId: string;
    url: string;
    prompt: string;
    extension: string;
    adjustments?: Record<string, number>;
    preset?: PresetType;
  },
) => {
  const album = await albumsRepo.fetchAlbumById(albumId, userId);
  if (!album) throw new NotFoundError('Album not found');

  const createdAt = new Date().toISOString();
  const id = await albumsRepo.insertAvatarIntoAlbum(albumId, userId, {
    ...avatar,
    createdAt,
  });

  return { id, ...avatar, createdAt };
};

export const addToAlbum = async (
  albumId: string,
  userId: string,
  avatarId: string,
) => {
  const avatar = await albumsRepo.fetchGeneratedImageById(userId, avatarId);
  if (!avatar) {
    throw new NotFoundError('Avatar not found');
  }

  const existing = await albumsRepo.findAlbumAvatarByAvatarId(
    albumId,
    userId,
    avatarId,
  );
  if (!existing.empty) {
    throw new BadRequestError('Avatar is already in this album');
  }

  const createdAt = new Date().toISOString();
  const id = await albumsRepo.insertAvatarIntoAlbum(albumId, userId, {
    avatarId,
    url: avatar.url,
    prompt: avatar.prompt,
    extension: avatar.extension,
    adjustments: avatar.adjustments,
    preset: avatar.preset,
    createdAt,
  });

  return {
    id,
    avatarId,
    url: avatar.url,
    prompt: avatar.prompt,
    extension: avatar.extension,
    createdAt,
  };
};
