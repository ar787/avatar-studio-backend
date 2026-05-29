import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Readable } from 'node:stream';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import { BadRequestError, NotFoundError } from '@/utils/errors/ApiErrors.js';
import { TestFactory } from '@/test/factories.js';

// ── service mocks ──────────────────────────────────────────────────────────

const mockGetUserAlbums = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockCreateAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGetAlbumById = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGetAlbumAvatars = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUpdateAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockDeleteAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockGetAlbumAvatarStream = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockDeleteAvatarFromAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockAddToAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('./service/albums.service.js', () => ({
  getUserAlbums: mockGetUserAlbums,
  createAlbum: mockCreateAlbum,
  getAlbumById: mockGetAlbumById,
  getAlbumAvatars: mockGetAlbumAvatars,
  updateAlbum: mockUpdateAlbum,
  deleteAlbum: mockDeleteAlbum,
  getAlbumAvatarStream: mockGetAlbumAvatarStream,
  deleteAvatarFromAlbum: mockDeleteAvatarFromAlbum,
  addToAlbum: mockAddToAlbum,
}));

// Uses the shared strict mock from src/middlewares/__mocks__/:
// missing x-test-uid → 401; present → sets req.user and calls next().
vi.mock('@/middlewares/verifyAuthToken.middleware.js');

import albumsRouter from './albums.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

// ── test app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/albums', albumsRouter);
app.use(errorHandler);

const AUTH = TestFactory.AUTH_HEADER;
const ALBUM_ID = 'album-abc';
const AVATAR_DOC_ID = 'avatar-doc-xyz';
const AVATAR_ID = 'source-avatar-id';

const BASE_ALBUM = TestFactory.album(ALBUM_ID);
const BASE_AVATAR = TestFactory.albumAvatar(AVATAR_DOC_ID, {
  avatarId: AVATAR_ID,
});

// ── GET /api/albums ────────────────────────────────────────────────────────

describe('GET /api/albums', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).get('/api/albums');
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with albums array', async () => {
    mockGetUserAlbums.mockResolvedValue([BASE_ALBUM]);

    const res = await request(app).get('/api/albums').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Array) });
    expect(mockGetUserAlbums).toHaveBeenCalledWith(TestFactory.CONTROLLER_UID);
  });

  it('responds 500 when the service throws', async () => {
    mockGetUserAlbums.mockRejectedValue(new Error('Firestore down'));

    const res = await request(app).get('/api/albums').set(AUTH);
    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── POST /api/albums ───────────────────────────────────────────────────────

describe('POST /api/albums', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).post('/api/albums').send({ name: 'Album' });
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 400 when name is missing', async () => {
    const res = await request(app).post('/api/albums').set(AUTH).send({});
    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 400 when name is whitespace only', async () => {
    const res = await request(app)
      .post('/api/albums')
      .set(AUTH)
      .send({ name: '   ' });
    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 201 with the new album and trims + capitalizes the name', async () => {
    mockCreateAlbum.mockResolvedValue(BASE_ALBUM);

    const res = await request(app)
      .post('/api/albums')
      .set(AUTH)
      .send({ name: ' my album ' });

    expect(res.status).toBe(HttpStatusCode.CREATED);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Object) });
    // trim + capitalizeFirstLetter(' my album ') → 'My album'
    expect(mockCreateAlbum).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      'My album',
    );
  });

  it('responds 500 when the service throws', async () => {
    mockCreateAlbum.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/albums')
      .set(AUTH)
      .send({ name: 'Test' });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── GET /api/albums/:albumId ───────────────────────────────────────────────

describe('GET /api/albums/:albumId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).get(`/api/albums/${ALBUM_ID}`);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 404 when the album does not exist', async () => {
    mockGetAlbumById.mockResolvedValue(undefined);
    mockGetAlbumAvatars.mockResolvedValue([]);

    const res = await request(app).get(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 200 with albumMetadata and avatars', async () => {
    mockGetAlbumById.mockResolvedValue(BASE_ALBUM);
    mockGetAlbumAvatars.mockResolvedValue([BASE_AVATAR]);

    const res = await request(app).get(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('albumMetadata');
    expect(res.body.data).toHaveProperty('avatars');
  });

  it('responds 500 when the service throws', async () => {
    mockGetAlbumById.mockRejectedValue(new Error('DB error'));
    mockGetAlbumAvatars.mockResolvedValue([]);

    const res = await request(app).get(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── PATCH /api/albums/:albumId ─────────────────────────────────────────────

describe('PATCH /api/albums/:albumId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app)
      .patch(`/api/albums/${ALBUM_ID}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with updated album', async () => {
    const updated = { ...BASE_ALBUM, name: 'Renamed' };
    mockUpdateAlbum.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/albums/${ALBUM_ID}`)
      .set(AUTH)
      .send({ name: 'renamed' });

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Object) });
    // capitalizeFirstLetter('renamed') → 'Renamed'
    expect(mockUpdateAlbum).toHaveBeenCalledWith(
      ALBUM_ID,
      TestFactory.CONTROLLER_UID,
      expect.objectContaining({ name: 'Renamed' }),
    );
  });

  it('responds 404 when service throws NotFoundError', async () => {
    mockUpdateAlbum.mockRejectedValue(new NotFoundError('Album not found'));

    const res = await request(app)
      .patch(`/api/albums/${ALBUM_ID}`)
      .set(AUTH)
      .send({ name: 'New Name' });

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 400 when service throws BadRequestError', async () => {
    mockUpdateAlbum.mockRejectedValue(
      new BadRequestError('At least one field must be provided to update'),
    );

    const res = await request(app)
      .patch(`/api/albums/${ALBUM_ID}`)
      .set(AUTH)
      .send({ name: 'New Name' });

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 500 when the service throws', async () => {
    mockUpdateAlbum.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .patch(`/api/albums/${ALBUM_ID}`)
      .set(AUTH)
      .send({ name: 'Test' });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── DELETE /api/albums/:albumId ────────────────────────────────────────────

describe('DELETE /api/albums/:albumId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).delete(`/api/albums/${ALBUM_ID}`);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with success message', async () => {
    mockDeleteAlbum.mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      message: 'Album deleted successfully',
    });
  });

  it('responds 404 when service throws NotFoundError', async () => {
    mockDeleteAlbum.mockRejectedValue(new NotFoundError('Album not found'));

    const res = await request(app).delete(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 500 when the service throws', async () => {
    mockDeleteAlbum.mockRejectedValue(new Error('DB error'));

    const res = await request(app).delete(`/api/albums/${ALBUM_ID}`).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── GET /api/albums/:albumId/avatars/:avatarDocId/download ─────────────────

describe('GET /api/albums/:albumId/avatars/:avatarDocId/download', () => {
  const DOWNLOAD_URL = `/api/albums/${ALBUM_ID}/avatars/${AVATAR_DOC_ID}/download`;

  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).get(DOWNLOAD_URL);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('streams the avatar and sets correct response headers', async () => {
    const filename = `avatar-${AVATAR_DOC_ID}.png`;
    const fakeStream = Readable.from(['avatar-bytes']);
    mockGetAlbumAvatarStream.mockResolvedValue({
      stream: fakeStream,
      filename,
    });

    const res = await request(app).get(DOWNLOAD_URL).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.headers['content-type']).toContain('application/octet-stream');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${filename}"`,
    );
    expect(mockGetAlbumAvatarStream).toHaveBeenCalledWith(
      ALBUM_ID,
      TestFactory.CONTROLLER_UID,
      AVATAR_DOC_ID,
    );
  });

  it('responds 404 when service throws NotFoundError', async () => {
    mockGetAlbumAvatarStream.mockRejectedValue(
      new NotFoundError('Avatar not found'),
    );

    const res = await request(app).get(DOWNLOAD_URL).set(AUTH);
    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 500 when the service throws', async () => {
    mockGetAlbumAvatarStream.mockRejectedValue(new Error('Storage error'));

    const res = await request(app).get(DOWNLOAD_URL).set(AUTH);
    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── DELETE /api/albums/:albumId/avatars/:avatarId ──────────────────────────

describe('DELETE /api/albums/:albumId/avatars/:avatarId', () => {
  const DELETE_AVATAR_URL = `/api/albums/${ALBUM_ID}/avatars/${AVATAR_ID}`;

  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app).delete(DELETE_AVATAR_URL);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with success message', async () => {
    mockDeleteAvatarFromAlbum.mockResolvedValue(undefined);

    const res = await request(app).delete(DELETE_AVATAR_URL).set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      message: 'Avatar successfully deleted from album',
    });
    expect(mockDeleteAvatarFromAlbum).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      ALBUM_ID,
      AVATAR_ID,
    );
  });

  it('responds 404 when service throws NotFoundError', async () => {
    mockDeleteAvatarFromAlbum.mockRejectedValue(
      new NotFoundError('Avatar not found in album'),
    );

    const res = await request(app).delete(DELETE_AVATAR_URL).set(AUTH);
    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 500 when the service throws', async () => {
    mockDeleteAvatarFromAlbum.mockRejectedValue(new Error('DB error'));

    const res = await request(app).delete(DELETE_AVATAR_URL).set(AUTH);
    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── POST /api/albums/:albumId/avatars ──────────────────────────────────────

describe('POST /api/albums/:albumId/avatars', () => {
  const ADD_AVATAR_URL = `/api/albums/${ALBUM_ID}/avatars`;

  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when not authenticated', async () => {
    const res = await request(app)
      .post(ADD_AVATAR_URL)
      .send({ avatarId: AVATAR_ID });
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 400 when avatarId is missing from the body', async () => {
    const res = await request(app).post(ADD_AVATAR_URL).set(AUTH).send({});
    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
    expect(mockAddToAlbum).not.toHaveBeenCalled();
  });

  it('responds 201 with the inserted avatar', async () => {
    mockAddToAlbum.mockResolvedValue({ id: 'new-doc-id', avatarId: AVATAR_ID });

    const res = await request(app)
      .post(ADD_AVATAR_URL)
      .set(AUTH)
      .send({ avatarId: AVATAR_ID });

    expect(res.status).toBe(HttpStatusCode.CREATED);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Object) });
    expect(mockAddToAlbum).toHaveBeenCalledWith(
      ALBUM_ID,
      TestFactory.CONTROLLER_UID,
      AVATAR_ID,
    );
  });

  it('responds 400 when service throws BadRequestError (avatar already in album)', async () => {
    mockAddToAlbum.mockRejectedValue(
      new BadRequestError('Avatar is already in this album'),
    );

    const res = await request(app)
      .post(ADD_AVATAR_URL)
      .set(AUTH)
      .send({ avatarId: AVATAR_ID });

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 404 when service throws NotFoundError', async () => {
    mockAddToAlbum.mockRejectedValue(new NotFoundError('Avatar not found'));

    const res = await request(app)
      .post(ADD_AVATAR_URL)
      .set(AUTH)
      .send({ avatarId: AVATAR_ID });

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 500 when the service throws', async () => {
    mockAddToAlbum.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post(ADD_AVATAR_URL)
      .set(AUTH)
      .send({ avatarId: AVATAR_ID });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});
