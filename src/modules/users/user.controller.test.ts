import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import { TestFactory } from '@/test/factories.js';

// ── service mocks ──────────────────────────────────────────────────────────

const mockGetUserProfile = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockRenameUser = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUploadAvatar = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('./service/user.service.js', () => ({
  getUserProfile: mockGetUserProfile,
  renameUser: mockRenameUser,
  uploadAvatar: mockUploadAvatar,
}));

// Uses the shared strict mock from src/middlewares/__mocks__/:
// missing x-test-uid → 401; present → sets req.user and calls next().
vi.mock('@/middlewares/verifyAuthToken.middleware.js');

import userRouter from './user.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

// ── test app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/users', userRouter);
app.use(errorHandler);

const AUTH = TestFactory.AUTH_HEADER;

// ── GET /getUserProfile ────────────────────────────────────────────────────

describe('GET /api/users/getUserProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).get('/api/users/getUserProfile');

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 with the user profile data', async () => {
    const fakeProfile = { displayName: 'Alice', credits: 5, isPremium: false };
    mockGetUserProfile.mockResolvedValue(fakeProfile);

    const res = await request(app).get('/api/users/getUserProfile').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, data: fakeProfile });
    expect(mockGetUserProfile).toHaveBeenCalledWith(TestFactory.CONTROLLER_UID);
  });

  it('responds 404 when the user profile does not exist', async () => {
    const { NotFoundError } = await import('@/utils/errors/ApiErrors.js');
    mockGetUserProfile.mockRejectedValue(
      new NotFoundError('User profile not found in database'),
    );

    const res = await request(app).get('/api/users/getUserProfile').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
  });

  it('responds 500 when the service throws an unexpected error', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('database crash'));

    const res = await request(app).get('/api/users/getUserProfile').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── PATCH /updateProfile ───────────────────────────────────────────────────

describe('PATCH /api/users/updateProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app)
      .patch('/api/users/updateProfile')
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 and renames the user', async () => {
    mockRenameUser.mockResolvedValue(undefined);

    const res = await request(app)
      .patch('/api/users/updateProfile')
      .set(AUTH)
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Profile updated successfully',
    });
    expect(mockRenameUser).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      'New Name',
    );
  });

  it('responds 500 when the service throws', async () => {
    mockRenameUser.mockRejectedValue(new Error('write failed'));

    const res = await request(app)
      .patch('/api/users/updateProfile')
      .set(AUTH)
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});

// ── PATCH /profile/image ───────────────────────────────────────────────────

describe('PATCH /api/users/profile/image', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app)
      .patch('/api/users/profile/image')
      .attach('picture', Buffer.from('data'), {
        filename: 'img.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 400 when no file is attached', async () => {
    const res = await request(app).patch('/api/users/profile/image').set(AUTH);

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 400 when a non-image file is attached', async () => {
    const res = await request(app)
      .patch('/api/users/profile/image')
      .set(AUTH)
      .attach('picture', Buffer.from('hello world'), {
        filename: 'document.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
  });

  it('responds 413 when the file exceeds the 3 MB limit', async () => {
    const bigBuffer = Buffer.alloc(4 * 1024 * 1024, 'x');

    const res = await request(app)
      .patch('/api/users/profile/image')
      .set(AUTH)
      .attach('picture', bigBuffer, {
        filename: 'big.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(HttpStatusCode.CONTENT_TO_LARGE);
  });

  it('responds 200 with the new picture URL and success message', async () => {
    const fakeResult = {
      picture: 'https://storage.example.com/img.png',
      message: 'Profile picture has successfully uploaded and updated',
    };
    mockUploadAvatar.mockResolvedValue(fakeResult);

    const res = await request(app)
      .patch('/api/users/profile/image')
      .set(AUTH)
      .attach('picture', Buffer.from('fake-image-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({ success: true, ...fakeResult });
    expect(mockUploadAvatar).toHaveBeenCalledWith(
      TestFactory.CONTROLLER_UID,
      expect.objectContaining({ mimetype: 'image/png' }),
    );
  });

  it('responds 500 when the service throws', async () => {
    mockUploadAvatar.mockRejectedValue(new Error('storage error'));

    const res = await request(app)
      .patch('/api/users/profile/image')
      .set(AUTH)
      .attach('picture', Buffer.from('fake-image-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});
