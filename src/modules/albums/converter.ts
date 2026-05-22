import {
  FieldValue,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { Album, AlbumAvatar } from './types.js';

export const albumConverter: FirestoreDataConverter<Album> = {
  toFirestore(album) {
    return {
      userId: album.userId,
      name: album.name,
      ...(album.description ? { description: album.description } : {}),
      ...(album.coverImageUrl ? { coverImageUrl: album.coverImageUrl } : {}),
      avatarCount: album.avatarCount,
      createdAt: album.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Album {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      userId: data.userId,
      name: data.name,
      description: data.description,
      coverImageUrl: data.coverImageUrl,
      avatarCount: data.avatarCount,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  },
};

export const albumAvatarConverter: FirestoreDataConverter<AlbumAvatar> = {
  toFirestore(albumAvatar) {
    return {
      avatarId: albumAvatar.avatarId,
      url: albumAvatar.url,
      prompt: albumAvatar.prompt,
      extension: albumAvatar.extension,
      createdAt: albumAvatar.createdAt,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): AlbumAvatar {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      avatarId: data.avatarId,
      url: data.url,
      prompt: data.prompt,
      extension: data.extension,
      createdAt: data.createdAt,
    };
  },
};
