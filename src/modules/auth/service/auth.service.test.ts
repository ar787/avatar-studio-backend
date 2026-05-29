import { vi, it, describe, beforeEach, expect } from 'vitest';
import { TestFactory } from '@/test/factories.js';

const mockCreateUserProfile = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockFindByUserId = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<boolean>>(),
);

vi.mock('../auth.repository.js', () => ({
  createUserProfile: mockCreateUserProfile,
  findByUserId: mockFindByUserId,
}));

import { initializeUser } from './auth.service.js';

// The service tests use 'test-uid' as the uid (distinct from the repository
// suite's AUTH_USER_ID) so we pass it explicitly to the factory.
const BASE_USER = TestFactory.authUser('test-uid');

describe('initializeUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the profile and returns isNew:true when the user does not exist yet', async () => {
    mockFindByUserId.mockResolvedValue(false);
    mockCreateUserProfile.mockResolvedValue(undefined);

    const result = await initializeUser(BASE_USER);

    expect(mockCreateUserProfile).toHaveBeenCalledWith(BASE_USER);
    expect(result).toEqual({ isNew: true });
  });

  it('skips creation and returns isNew:false when the user already exists', async () => {
    mockFindByUserId.mockResolvedValue(true);

    const result = await initializeUser(BASE_USER);

    expect(mockCreateUserProfile).not.toHaveBeenCalled();
    expect(result).toEqual({ isNew: false });
  });

  it('checks existence using the correct uid', async () => {
    mockFindByUserId.mockResolvedValue(false);
    mockCreateUserProfile.mockResolvedValue(undefined);

    await initializeUser(BASE_USER);

    expect(mockFindByUserId).toHaveBeenCalledWith('test-uid');
  });
});
