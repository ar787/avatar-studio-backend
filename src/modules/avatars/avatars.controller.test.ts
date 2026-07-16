import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Readable } from 'node:stream';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import { TestFactory } from '@/test/factories.js';

// ── service mocks ──────────────────────────────────────────────────────────
const mockGetAllPublicCatalog = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGetCatalogStream = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGenerateImages = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGetGeneratedAvatars = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGeneratorGetStream = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUploadEditedAvatar = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockAddUploadedAvatarToAlbum = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('./service/avatar-public.service.js', () => ({
  getAllPublicCatalog: mockGetAllPublicCatalog,
  getAvatarStream: mockGetCatalogStream,
}));

vi.mock('./service/avatar-generator.service.js', () => ({
  generateImages: mockGenerateImages,
  getGeneratedAvatars: mockGetGeneratedAvatars,
  getAvatarStream: mockGeneratorGetStream,
  uploadEditedAvatar: mockUploadEditedAvatar,
}));

vi.mock('@/modules/albums/service/albums.service.js', () => ({
  addUploadedAvatarToAlbum: mockAddUploadedAvatarToAlbum,
}));

// ── auth middleware mock ───────────────────────────────────────────────────
// Passthrough variant: always calls next(), sets req.user only when the
// x-test-uid header is present. The controller's own auth guard fires for
// unauthenticated requests (not the middleware). Intentionally different from
// the shared strict mock in src/middlewares/__mocks__/.
vi.mock('@/middlewares/verifyAuthToken.middleware.js', () => ({
  verifyAuthTokenHandler: (req: unknown, _: unknown, next: unknown) => {
    const r = req as {
      headers: Record<string, string | undefined>;
      user?: unknown;
    };
    const uid = r.headers['x-test-uid'];
    if (uid) {
      r.user = {
        uid,
        email: '',
        emailVerified: false,
        displayName: '',
        picture: '',
      };
    }
    (next as () => void)();
  },
}));

import avatarRouter from './avatars.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

// ── test app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/v1/avatars', avatarRouter);
app.use(errorHandler);

const AUTH = TestFactory.AUTH_HEADER;

// ── tests ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 200 with success:true and avatar data', async () => {
    const fakeAvatars = [{ name: 'a.png' }, { name: 'b.png' }];
    mockGetAllPublicCatalog.mockResolvedValue(fakeAvatars);

    const res = await request(app).get('/api/v1/avatars');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeAvatars });
  });

  it('responds 500 when the service throws', async () => {
    mockGetAllPublicCatalog.mockRejectedValue(new Error('Firestore down'));

    const res = await request(app).get('/api/v1/avatars');

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe('GET /api/v1/avatars/library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).get('/api/v1/avatars/library');

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with the user avatars', async () => {
    const fakeAvatars = [{ id: '1' }];
    mockGetGeneratedAvatars.mockResolvedValue(fakeAvatars);

    const res = await request(app).get('/api/v1/avatars/library').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeAvatars });
    expect(mockGetGeneratedAvatars).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
    );
  });
});

describe('POST /api/v1/avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/avatars')
      .send({ prompt: 'a cat' });

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with the generation result', async () => {
    const fakeResult = {
      generatedAvatarUrls: ['https://x.com/img.png'],
      remainingCredits: 3,
      message: 'ok',
    };
    mockGenerateImages.mockResolvedValue(fakeResult);

    const res = await request(app)
      .post('/api/v1/avatars')
      .set(AUTH)
      .send({ prompt: 'a robot' });

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeResult });
    expect(mockGenerateImages).toHaveBeenCalledWith(
      'a robot',
      TestFactory.CONTROLLER_UID,
      undefined,
    );
  });

  it('forwards the style from the request body to the service', async () => {
    mockGenerateImages.mockResolvedValue({
      generatedAvatarUrls: [],
      remainingCredits: 2,
      message: 'ok',
    });

    await request(app)
      .post('/api/v1/avatars')
      .set(AUTH)
      .send({ prompt: 'a wizard', style: 'anime' });

    expect(mockGenerateImages).toHaveBeenCalledWith(
      'a wizard',
      TestFactory.CONTROLLER_UID,
      'anime',
    );
  });

  it('responds 500 when the service throws', async () => {
    mockGenerateImages.mockRejectedValue(new Error('unexpected failure'));

    const res = await request(app)
      .post('/api/v1/avatars')
      .set(AUTH)
      .send({ prompt: 'a cat' });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe('GET /api/v1/avatars/:filename/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pipes the stream and sets Content-Disposition', async () => {
    const fakeStream = Readable.from(Buffer.from('fake-image-bytes'));
    mockGetCatalogStream.mockResolvedValue(fakeStream);

    const res = await request(app).get('/api/v1/avatars/avatar.png/download');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockGetCatalogStream).toHaveBeenCalledWith('avatar.png');
    expect(res.headers['content-disposition']).toContain('avatar.png');
  });
});

describe('GET /api/v1/avatars/library/:filename/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).get(
      '/api/v1/avatars/library/my-avatar.png/download',
    );

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('pipes the stream and sets Content-Disposition', async () => {
    const fakeStream = Readable.from(Buffer.from('fake-image-bytes'));
    mockGeneratorGetStream.mockResolvedValue(fakeStream);

    const res = await request(app)
      .get('/api/v1/avatars/library/my-avatar.png/download')
      .set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockGeneratorGetStream).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      'my-avatar.png',
    );
    expect(res.headers['content-disposition']).toContain('my-avatar.png');
  });
});

describe('POST /api/v1/avatars/save-edited', () => {
  const FAKE_AVATAR_RESULT = {
    avatar: {
      avatarId: 'new-doc-id',
      url: 'https://storage.example.com/edited.png',
      prompt: 'anime ninja',
      extension: 'png',
    },
    remainingCredits: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadEditedAvatar.mockResolvedValue(FAKE_AVATAR_RESULT);
    mockAddUploadedAvatarToAlbum.mockResolvedValue({});
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/avatars/save-edited')
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id');

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .field('avatarId', 'src-avatar-id');

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 400 when avatarId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png');

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 201 with avatar and remainingCredits on success', async () => {
    const res = await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id');

    expect(res.status).toBe(HttpStatusCode.CREATED);
    expect(res.body).toEqual({
      success: true,
      data: { avatar: FAKE_AVATAR_RESULT.avatar, remainingCredits: 3 },
    });
  });

  it('passes parsed adjustments and preset to the service', async () => {
    const adjustments = { brightness: 0.79, contrast: 0 };

    await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id')
      .field('adjustments', JSON.stringify(adjustments))
      .field('preset', 'invert');

    expect(mockUploadEditedAvatar).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      'src-avatar-id',
      expect.any(Object),
      adjustments,
      'invert',
    );
  });

  it('treats the string "undefined" for albumId as absent', async () => {
    await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id')
      .field('albumId', 'undefined');

    expect(mockAddUploadedAvatarToAlbum).not.toHaveBeenCalled();
  });

  it('treats the string "undefined" for preset as absent', async () => {
    await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id')
      .field('preset', 'undefined');

    expect(mockUploadEditedAvatar).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      undefined,
      undefined,
    );
  });

  it('calls addUploadedAvatarToAlbum when a valid albumId is provided', async () => {
    await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id')
      .field('albumId', 'album-xyz');

    expect(mockAddUploadedAvatarToAlbum).toHaveBeenCalledWith(
      'album-xyz',
      TestFactory.CONTROLLER_UID,
      FAKE_AVATAR_RESULT.avatar,
    );
  });

  it('does NOT call addUploadedAvatarToAlbum when albumId is absent', async () => {
    await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id');

    expect(mockAddUploadedAvatarToAlbum).not.toHaveBeenCalled();
  });

  it('responds 500 when the service throws', async () => {
    mockUploadEditedAvatar.mockRejectedValue(new Error('Storage error'));

    const res = await request(app)
      .post('/api/v1/avatars/save-edited')
      .set(AUTH)
      .attach('file', Buffer.from('img'), 'edited.png')
      .field('avatarId', 'src-avatar-id');

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});
