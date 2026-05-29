import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import { TestFactory } from '@/test/factories.js';

const mockInitializeUser = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('./service/auth.service.js', () => ({
  initializeUser: mockInitializeUser,
}));

// Uses the shared strict mock from src/middlewares/__mocks__/:
// missing x-test-uid → 401; present → sets req.user and calls next().
vi.mock('@/middlewares/verifyAuthToken.middleware.js');

import userRouter from './auth.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

// ── test app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/auth', userRouter);
app.use(errorHandler);

const AUTH = TestFactory.AUTH_HEADER;

// ── POST createUserDocument ────────────────────────────────────────────────

describe('POST /api/auth/createUserDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds 401 when no user is authenticated', async () => {
    const res = await request(app).post('/api/auth/createUserDocument');
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('responds 200 when the user profile already exists', async () => {
    mockInitializeUser.mockResolvedValue({ isNew: false });

    const res = await request(app)
      .post('/api/auth/createUserDocument')
      .set(AUTH);

    expect(mockInitializeUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: TestFactory.CONTROLLER_UID }),
    );
    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      message: 'User profile already exists',
    });
  });

  it('responds 201 when the user profile does not exist yet', async () => {
    mockInitializeUser.mockResolvedValue({ isNew: true });
    const res = await request(app)
      .post('/api/auth/createUserDocument')
      .set(AUTH);

    expect(res.status).toBe(HttpStatusCode.CREATED);
    expect(res.body).toEqual({
      success: true,
      message: 'User profile initialized successfully',
    });
  });

  it('responds 500 when the service throws', async () => {
    mockInitializeUser.mockRejectedValue(new Error('Firestore down'));
    const res = await request(app)
      .post('/api/auth/createUserDocument')
      .set(AUTH);

    expect(res.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
  });
});
