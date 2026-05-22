export type Album = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  avatarCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateAlbumPayload = Partial<
  Pick<Album, 'name' | 'description' | 'coverImageUrl'>
>;

export type AlbumAvatar = {
  id: string;
  avatarId: string;
  url: string;
  prompt: string;
  extension: string;
  createdAt: string;
};
