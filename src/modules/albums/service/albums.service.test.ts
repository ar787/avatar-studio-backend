import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { NotFoundError, BadRequestError } from '@/utils/errors/ApiErrors.js';
import { TestFactory } from '@/test/factories.js';

// ── mocks ──────────────────────────────────────────────────────────────────

const mockFetchUserAlbums = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockCreateAlbumDoc = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockFetchAlbumById = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockFetchAlbumAvatars = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUpdateAlbumDoc = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockDeleteAlbumRepo = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockFetchAlbumAvatarById = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockFetchGeneratedImageById = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockFindAlbumAvatarByAvatarId = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockInsertAvatarIntoAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockDeleteAvatarFromAlbumRepo = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockGetAvatarStream = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('../albums.repository.js', () => ({
  fetchUserAlbums: mockFetchUserAlbums,
  createAlbumDoc: mockCreateAlbumDoc,
  fetchAlbumById: mockFetchAlbumById,
  fetchAlbumAvatars: mockFetchAlbumAvatars,
  updateAlbumDoc: mockUpdateAlbumDoc,
  deleteAlbum: mockDeleteAlbumRepo,
  fetchAlbumAvatarById: mockFetchAlbumAvatarById,
  fetchGeneratedImageById: mockFetchGeneratedImageById,
  findAlbumAvatarByAvatarId: mockFindAlbumAvatarByAvatarId,
  insertAvatarIntoAlbum: mockInsertAvatarIntoAlbum,
  deleteAvatarFromAlbum: mockDeleteAvatarFromAlbumRepo,
}));

vi.mock('@/modules/avatars/service/avatar-shared.service.js', () => ({
  getAvatarStream: mockGetAvatarStream,
}));

import {
  getUserAlbums,
  createAlbum,
  getAlbumById,
  getAlbumAvatars,
  updateAlbum,
  deleteAlbum,
  getAlbumAvatarStream,
  deleteAvatarFromAlbum,
  addToAlbum,
} from './albums.service.js';

// ── shared fixtures ────────────────────────────────────────────────────────

const ALBUM_ID = 'album-123';
const USER_ID = 'user-456';
const AVATAR_DOC_ID = 'avatar-doc-789';
const AVATAR_ID = 'source-avatar-id';

const BASE_ALBUM = TestFactory.album(ALBUM_ID, {
  userId: USER_ID,
  avatarCount: 1,
});
const BASE_ALBUM_AVATAR = TestFactory.albumAvatar(AVATAR_DOC_ID, {
  avatarId: AVATAR_ID,
});
const BASE_GENERATED_IMAGE = TestFactory.generatedImage(USER_ID, {
  url: 'https://example.com/generated.png',
  prompt: 'test prompt',
  storagePath: 'storage/path/image.png',
});

// ── getUserAlbums ──────────────────────────────────────────────────────────

describe('getUserAlbums', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the list of albums from the repository', async () => {
    mockFetchUserAlbums.mockResolvedValue([BASE_ALBUM]);

    const result = await getUserAlbums(USER_ID);

    expect(mockFetchUserAlbums).toHaveBeenCalledWith(USER_ID);
    expect(result).toEqual([BASE_ALBUM]);
  });

  it('propagates rejection from the repository', async () => {
    mockFetchUserAlbums.mockRejectedValue(new Error('Firestore down'));

    await expect(getUserAlbums(USER_ID)).rejects.toThrow('Firestore down');
  });
});

// ── createAlbum ────────────────────────────────────────────────────────────

describe('createAlbum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls createAlbumDoc with correct shape and returns the result', async () => {
    mockCreateAlbumDoc.mockResolvedValue(BASE_ALBUM);

    const result = await createAlbum(USER_ID, 'My Album');

    expect(mockCreateAlbumDoc).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        userId: USER_ID,
        name: 'My Album',
        avatarCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(BASE_ALBUM);
  });
});

// ── getAlbumById ───────────────────────────────────────────────────────────

describe('getAlbumById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the album when it exists', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);

    const result = await getAlbumById(ALBUM_ID, USER_ID);

    expect(mockFetchAlbumById).toHaveBeenCalledWith(ALBUM_ID, USER_ID);
    expect(result).toEqual(BASE_ALBUM);
  });

  it('returns undefined when the album does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(undefined);

    const result = await getAlbumById('nonexistent-id', USER_ID);
    expect(result).toBeUndefined();
  });
});

// ── getAlbumAvatars ────────────────────────────────────────────────────────

describe('getAlbumAvatars', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the list of avatars from the repository', async () => {
    mockFetchAlbumAvatars.mockResolvedValue([BASE_ALBUM_AVATAR]);

    const result = await getAlbumAvatars(ALBUM_ID, USER_ID);

    expect(mockFetchAlbumAvatars).toHaveBeenCalledWith(ALBUM_ID, USER_ID);
    expect(result).toEqual([BASE_ALBUM_AVATAR]);
  });
});

// ── updateAlbum ────────────────────────────────────────────────────────────

describe('updateAlbum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundError when the album does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(undefined);

    await expect(
      updateAlbum(ALBUM_ID, USER_ID, { name: 'New Name' }),
    ).rejects.toThrow(NotFoundError);
    expect(mockUpdateAlbumDoc).not.toHaveBeenCalled();
  });

  it('throws BadRequestError when the payload is empty', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);

    await expect(updateAlbum(ALBUM_ID, USER_ID, {})).rejects.toThrow(
      BadRequestError,
    );
    expect(mockUpdateAlbumDoc).not.toHaveBeenCalled();
  });

  it('throws BadRequestError when name is an empty string', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);

    await expect(updateAlbum(ALBUM_ID, USER_ID, { name: '' })).rejects.toThrow(
      BadRequestError,
    );
    expect(mockUpdateAlbumDoc).not.toHaveBeenCalled();
  });

  it('updates the album and returns the refreshed data', async () => {
    const updatedAlbum = { ...BASE_ALBUM, name: 'Renamed Album' };
    mockFetchAlbumById
      .mockResolvedValueOnce(BASE_ALBUM) // existence check
      .mockResolvedValueOnce(updatedAlbum); // return after update
    mockUpdateAlbumDoc.mockResolvedValue(undefined);

    const result = await updateAlbum(ALBUM_ID, USER_ID, {
      name: 'Renamed Album',
    });

    expect(mockUpdateAlbumDoc).toHaveBeenCalledWith(ALBUM_ID, USER_ID, {
      name: 'Renamed Album',
    });
    expect(result).toEqual(updatedAlbum);
  });

  it('allows a partial payload that omits name', async () => {
    const updatedAlbum = { ...BASE_ALBUM, description: 'new desc' };
    mockFetchAlbumById
      .mockResolvedValueOnce(BASE_ALBUM)
      .mockResolvedValueOnce(updatedAlbum);
    mockUpdateAlbumDoc.mockResolvedValue(undefined);

    const result = await updateAlbum(ALBUM_ID, USER_ID, {
      description: 'new desc',
    });

    expect(mockUpdateAlbumDoc).toHaveBeenCalled();
    expect(result).toEqual(updatedAlbum);
  });
});

// ── deleteAlbum ────────────────────────────────────────────────────────────

describe('deleteAlbum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundError when the album does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(undefined);

    await expect(deleteAlbum(ALBUM_ID, USER_ID)).rejects.toThrow(NotFoundError);
    expect(mockDeleteAlbumRepo).not.toHaveBeenCalled();
  });

  it('calls the repository deleteAlbum when the album exists', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockDeleteAlbumRepo.mockResolvedValue(undefined);

    await deleteAlbum(ALBUM_ID, USER_ID);

    expect(mockDeleteAlbumRepo).toHaveBeenCalledWith(ALBUM_ID, USER_ID);
  });
});

// ── getAlbumAvatarStream ───────────────────────────────────────────────────

describe('getAlbumAvatarStream', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundError when the album does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(undefined);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);

    await expect(
      getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the album avatar does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(undefined);

    await expect(
      getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the original generated image does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);
    mockFetchGeneratedImageById.mockResolvedValue(undefined);

    await expect(
      getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('returns the stream and a correctly formatted filename', async () => {
    const fakeStream = new Readable();
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockGetAvatarStream.mockResolvedValue(fakeStream);

    const result = await getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID);

    expect(result.stream).toBe(fakeStream);
    expect(result.filename).toBe(
      `avatar-${AVATAR_DOC_ID}.${BASE_GENERATED_IMAGE.extension}`,
    );
  });

  it('calls getAvatarStream with the correct filename and storagePath', async () => {
    const fakeStream = new Readable();
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockGetAvatarStream.mockResolvedValue(fakeStream);

    await getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID);

    expect(mockGetAvatarStream).toHaveBeenCalledWith(
      `avatar-${AVATAR_DOC_ID}.${BASE_GENERATED_IMAGE.extension}`,
      BASE_GENERATED_IMAGE.storagePath,
    );
  });

  it('uses the avatarId from the album avatar to fetch the generated image', async () => {
    const fakeStream = new Readable();
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockGetAvatarStream.mockResolvedValue(fakeStream);

    await getAlbumAvatarStream(ALBUM_ID, USER_ID, AVATAR_DOC_ID);

    expect(mockFetchGeneratedImageById).toHaveBeenCalledWith(
      USER_ID,
      BASE_ALBUM_AVATAR.avatarId,
    );
  });
});

// ── deleteAvatarFromAlbum ─────────────────────────────────────────────────

describe('deleteAvatarFromAlbum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundError when the album does not exist', async () => {
    mockFetchAlbumById.mockResolvedValue(undefined);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);

    await expect(
      deleteAvatarFromAlbum(USER_ID, ALBUM_ID, AVATAR_DOC_ID),
    ).rejects.toThrow(NotFoundError);
    expect(mockDeleteAvatarFromAlbumRepo).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the avatar does not exist in the album', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(undefined);

    await expect(
      deleteAvatarFromAlbum(USER_ID, ALBUM_ID, AVATAR_DOC_ID),
    ).rejects.toThrow(NotFoundError);
    expect(mockDeleteAvatarFromAlbumRepo).not.toHaveBeenCalled();
  });

  it('calls the repository when both album and avatar exist', async () => {
    mockFetchAlbumById.mockResolvedValue(BASE_ALBUM);
    mockFetchAlbumAvatarById.mockResolvedValue(BASE_ALBUM_AVATAR);
    mockDeleteAvatarFromAlbumRepo.mockResolvedValue(undefined);

    await deleteAvatarFromAlbum(USER_ID, ALBUM_ID, AVATAR_DOC_ID);

    expect(mockDeleteAvatarFromAlbumRepo).toHaveBeenCalledWith(
      USER_ID,
      ALBUM_ID,
      AVATAR_DOC_ID,
    );
  });
});

// ── addToAlbum ────────────────────────────────────────────────────────────

describe('addToAlbum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundError when the generated image does not exist', async () => {
    mockFetchGeneratedImageById.mockResolvedValue(undefined);

    await expect(addToAlbum(ALBUM_ID, USER_ID, AVATAR_ID)).rejects.toThrow(
      NotFoundError,
    );
    expect(mockInsertAvatarIntoAlbum).not.toHaveBeenCalled();
  });

  it('throws BadRequestError when the avatar is already in the album', async () => {
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockFindAlbumAvatarByAvatarId.mockResolvedValue({ empty: false });

    await expect(addToAlbum(ALBUM_ID, USER_ID, AVATAR_ID)).rejects.toThrow(
      BadRequestError,
    );
    expect(mockInsertAvatarIntoAlbum).not.toHaveBeenCalled();
  });

  it('inserts the avatar with data from the generated image', async () => {
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockFindAlbumAvatarByAvatarId.mockResolvedValue({ empty: true });
    mockInsertAvatarIntoAlbum.mockResolvedValue('new-doc-id');

    await addToAlbum(ALBUM_ID, USER_ID, AVATAR_ID);

    expect(mockInsertAvatarIntoAlbum).toHaveBeenCalledWith(
      ALBUM_ID,
      USER_ID,
      expect.objectContaining({
        avatarId: AVATAR_ID,
        url: BASE_GENERATED_IMAGE.url,
        prompt: BASE_GENERATED_IMAGE.prompt,
        extension: BASE_GENERATED_IMAGE.extension,
        createdAt: expect.any(String),
      }),
    );
  });

  it('returns the inserted avatar with all correct fields', async () => {
    const NEW_AVATAR_DOC_ID = 'new-doc-id';
    mockFetchGeneratedImageById.mockResolvedValue(BASE_GENERATED_IMAGE);
    mockFindAlbumAvatarByAvatarId.mockResolvedValue({ empty: true });
    mockInsertAvatarIntoAlbum.mockResolvedValue(NEW_AVATAR_DOC_ID);

    const result = await addToAlbum(ALBUM_ID, USER_ID, AVATAR_ID);

    expect(result.id).toBe(NEW_AVATAR_DOC_ID);
    expect(result.avatarId).toBe(AVATAR_ID);
    expect(result.url).toBe(BASE_GENERATED_IMAGE.url);
    expect(result.prompt).toBe(BASE_GENERATED_IMAGE.prompt);
    expect(result.extension).toBe(BASE_GENERATED_IMAGE.extension);
    expect(typeof result.createdAt).toBe('string');
  });
});
