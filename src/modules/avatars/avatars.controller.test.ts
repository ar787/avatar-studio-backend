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

vi.mock('./service/avatar-public.service.js', () => ({
  getAllPublicCatalog: mockGetAllPublicCatalog,
  getAvatarStream: mockGetCatalogStream,
}));

vi.mock('./service/avatar-generator.service.js', () => ({
  generateImages: mockGenerateImages,
  getGeneratedAvatars: mockGetGeneratedAvatars,
  getAvatarStream: mockGeneratorGetStream,
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
app.use('/api/avatars', avatarRouter);
app.use(errorHandler);

const AUTH = TestFactory.AUTH_HEADER;

// ── tests ──────────────────────────────────────────────────────────────────

describe('GET /api/avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 200 with success:true and avatar data', async () => {
    const fakeAvatars = [{ name: 'a.png' }, { name: 'b.png' }];
    mockGetAllPublicCatalog.mockResolvedValue(fakeAvatars);

    const res = await request(app).get('/api/avatars');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeAvatars });
  });

  it('responds 500 when the service throws', async () => {
    mockGetAllPublicCatalog.mockRejectedValue(new Error('Firestore down'));

    const res = await request(app).get('/api/avatars');

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe('GET /api/avatars/generated-avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).get('/api/avatars/generated-avatars');

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with the user avatars', async () => {
    const fakeAvatars = [{ id: '1' }];
    mockGetGeneratedAvatars.mockResolvedValue(fakeAvatars);

    const res = await request(app)
      .get('/api/avatars/generated-avatars')
      .set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeAvatars });
    expect(mockGetGeneratedAvatars).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
    );
  });
});

describe('POST /api/avatars/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app)
      .post('/api/avatars/generate')
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
      .post('/api/avatars/generate')
      .set(AUTH)
      .send({ prompt: 'a robot' });

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeResult });
    expect(mockGenerateImages).toHaveBeenCalledWith(
      'a robot',
      TestFactory.CONTROLLER_UID,
    );
  });

  it('responds 500 when the service throws', async () => {
    mockGenerateImages.mockRejectedValue(new Error('unexpected failure'));

    const res = await request(app)
      .post('/api/avatars/generate')
      .set(AUTH)
      .send({ prompt: 'a cat' });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe('GET /api/avatars/download/:filename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pipes the stream and sets Content-Disposition', async () => {
    const fakeStream = Readable.from(Buffer.from('fake-image-bytes'));
    mockGetCatalogStream.mockResolvedValue(fakeStream);

    const res = await request(app).get('/api/avatars/download/avatar.png');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockGetCatalogStream).toHaveBeenCalledWith('avatar.png');
    expect(res.headers['content-disposition']).toContain('avatar.png');
  });
});

describe('GET /api/avatars/download-from-library/:filename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).get(
      '/api/avatars/download-from-library/my-avatar.png',
    );

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('pipes the stream and sets Content-Disposition', async () => {
    const fakeStream = Readable.from(Buffer.from('fake-image-bytes'));
    mockGeneratorGetStream.mockResolvedValue(fakeStream);

    const res = await request(app)
      .get('/api/avatars/download-from-library/my-avatar.png')
      .set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockGeneratorGetStream).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      'my-avatar.png',
    );
    expect(res.headers['content-disposition']).toContain('my-avatar.png');
  });
});
