import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── repository mocks ───────────────────────────────────────────────────────

const mockGetUserProfileData = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockCheckIsDocExists = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => boolean>(),
);
const mockUpdateUserProfile = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUploadImage = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockRunUpdateCreditTransaction = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<number>>(),
);
const mockIncrementCredits = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);

vi.mock('../user.repository.js', () => ({
  getUserProfileData: mockGetUserProfileData,
  checkIsDocExists: mockCheckIsDocExists,
  updateUserProfile: mockUpdateUserProfile,
  uploadImage: mockUploadImage,
  runUpdateCreditTransaction: mockRunUpdateCreditTransaction,
  incrementCredits: mockIncrementCredits,
}));

vi.mock('uuid', () => ({ v4: () => 'test-token-uuid' }));

vi.mock('@/config/config.js', () => ({
  default: {
    firebaseStorageBucket: 'test-bucket',
    storageBaseUrl: 'https://firebasestorage.googleapis.com/v0/b',
  },
}));

import {
  getUserProfile,
  renameUser,
  uploadAvatar,
  deductCredits,
  addCredits,
} from './user.service.js';
import { NotFoundError, ForbiddenError } from '@/utils/errors/ApiErrors.js';

// ── getUserProfile ─────────────────────────────────────────────────────────

describe('getUserProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns profile data when the user document exists', async () => {
    const fakeProfile = { displayName: 'Alice', credits: 10 };
    const fakeDoc = { data: () => fakeProfile };
    mockGetUserProfileData.mockResolvedValue(fakeDoc);
    mockCheckIsDocExists.mockReturnValue(true);

    const result = await getUserProfile('user-123');

    expect(mockGetUserProfileData).toHaveBeenCalledWith('user-123');
    expect(mockCheckIsDocExists).toHaveBeenCalledWith(fakeDoc);
    expect(result).toBe(fakeProfile);
  });

  it('throws NotFoundError when the user document does not exist', async () => {
    const fakeDoc = { data: () => undefined };
    mockGetUserProfileData.mockResolvedValue(fakeDoc);
    mockCheckIsDocExists.mockReturnValue(false);

    await expect(getUserProfile('missing-user')).rejects.toThrow(NotFoundError);
    await expect(getUserProfile('missing-user')).rejects.toThrow(
      'User profile not found in database',
    );
  });

  it('propagates unexpected errors from the repository', async () => {
    mockGetUserProfileData.mockRejectedValue(new Error('Firestore down'));

    await expect(getUserProfile('user-123')).rejects.toThrow('Firestore down');
  });
});

// ── renameUser ─────────────────────────────────────────────────────────────

describe('renameUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to updateUserProfile with the new display name', async () => {
    mockUpdateUserProfile.mockResolvedValue(undefined);

    await renameUser('user-123', 'New Name');

    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
      displayName: 'New Name',
    });
  });

  it('propagates errors from the repository', async () => {
    mockUpdateUserProfile.mockRejectedValue(new Error('write failed'));

    await expect(renameUser('user-123', 'New Name')).rejects.toThrow(
      'write failed',
    );
  });
});

// ── uploadAvatar ───────────────────────────────────────────────────────────

const FAKE_FILE = {
  buffer: Buffer.from('fake-image-data'),
  mimetype: 'image/png',
  fieldname: 'picture',
} as Express.Multer.File;

describe('uploadAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadImage.mockResolvedValue(undefined);
    mockUpdateUserProfile.mockResolvedValue(undefined);
  });

  it('builds the correct permanent URL', async () => {
    const result = await uploadAvatar('user-123', FAKE_FILE);

    const storagePath = 'users/user-123/profile-pictures/picture';
    const encodedPath = encodeURIComponent(storagePath);
    const expectedUrl =
      `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/` +
      `${encodedPath}?alt=media&token=test-token-uuid`;

    expect(result.picture).toBe(expectedUrl);
  });

  it('returns the success message', async () => {
    const result = await uploadAvatar('user-123', FAKE_FILE);

    expect(result.message).toBe(
      'Profile picture has successfully uploaded and updated',
    );
  });

  it('calls uploadImage with the correct storage path and token', async () => {
    await uploadAvatar('user-123', FAKE_FILE);

    expect(mockUploadImage).toHaveBeenCalledWith(
      'users/user-123/profile-pictures/picture',
      FAKE_FILE,
      'test-token-uuid',
    );
  });

  it('updates the user profile with the new picture URL', async () => {
    await uploadAvatar('user-123', FAKE_FILE);

    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        picture: expect.stringContaining('test-token-uuid'),
      }),
    );
  });

  it('propagates errors when uploadImage fails', async () => {
    mockUploadImage.mockRejectedValue(new Error('storage error'));

    await expect(uploadAvatar('user-123', FAKE_FILE)).rejects.toThrow(
      'storage error',
    );
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
});

// ── deductCredits ──────────────────────────────────────────────────────────

describe('deductCredits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deducts the amount and returns the new credit balance', async () => {
    mockRunUpdateCreditTransaction.mockImplementation(
      async (_userId: unknown, fn: unknown) =>
        (fn as (n: number) => number)(10),
    );

    const result = await deductCredits('user-123', 3);

    expect(result).toBe(7);
    expect(mockRunUpdateCreditTransaction).toHaveBeenCalledWith(
      'user-123',
      expect.any(Function),
    );
  });

  it('throws ForbiddenError when credits are insufficient', async () => {
    mockRunUpdateCreditTransaction.mockImplementation(
      async (_userId: unknown, fn: unknown) => (fn as (n: number) => number)(2),
    );

    await expect(deductCredits('user-123', 5)).rejects.toThrow(ForbiddenError);
    await expect(deductCredits('user-123', 5)).rejects.toThrow(
      'Insufficient credits.',
    );
  });

  it('allows deduction when credits exactly equal the amount', async () => {
    mockRunUpdateCreditTransaction.mockImplementation(
      async (_userId: unknown, fn: unknown) => (fn as (n: number) => number)(5),
    );

    const result = await deductCredits('user-123', 5);

    expect(result).toBe(0);
  });

  it('propagates NotFoundError when the user does not exist', async () => {
    mockRunUpdateCreditTransaction.mockRejectedValue(
      new NotFoundError('User profile not found.'),
    );

    await expect(deductCredits('missing-user', 1)).rejects.toThrow(
      NotFoundError,
    );
  });
});

// ── addCredits ─────────────────────────────────────────────────────────────

describe('addCredits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to incrementCredits with the correct arguments', async () => {
    mockIncrementCredits.mockResolvedValue(undefined);

    await addCredits('user-123', 5);

    expect(mockIncrementCredits).toHaveBeenCalledWith('user-123', 5);
  });

  it('propagates errors from the repository', async () => {
    mockIncrementCredits.mockRejectedValue(new Error('write failed'));

    await expect(addCredits('user-123', 5)).rejects.toThrow('write failed');
  });
});
