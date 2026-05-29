import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockCheckFileExists = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<boolean>>(),
);
const mockGetFileReference = vi.hoisted(() => vi.fn());

vi.mock('../avatars.repository.js', () => ({
  checkFileExists: mockCheckFileExists,
  getFileReference: mockGetFileReference,
}));

import { getAvatarStream } from './avatar-shared.service.js';
import { NotFoundError } from '@/utils/errors/ApiErrors.js';

describe('getAvatarStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundError when the file does not exist', async () => {
    mockCheckFileExists.mockResolvedValue(false);

    await expect(
      getAvatarStream('missing.png', 'avatars/missing.png'),
    ).rejects.toThrow(NotFoundError);

    await expect(
      getAvatarStream('missing.png', 'avatars/missing.png'),
    ).rejects.toThrow("Avatar 'missing.png' not found in storage.");
  });

  it('returns a read stream when the file exists', async () => {
    const fakeStream = { pipe: vi.fn() };
    mockCheckFileExists.mockResolvedValue(true);
    mockGetFileReference.mockReturnValue({
      createReadStream: () => fakeStream,
    });

    const result = await getAvatarStream('img.png', 'avatars/img.png');

    expect(mockGetFileReference).toHaveBeenCalledWith('avatars/img.png');
    expect(result).toBe(fakeStream);
  });

  it('does not call getFileReference when file is missing', async () => {
    mockCheckFileExists.mockResolvedValue(false);

    await expect(
      getAvatarStream('gone.png', 'avatars/gone.png'),
    ).rejects.toThrow();

    expect(mockGetFileReference).not.toHaveBeenCalled();
  });
});
