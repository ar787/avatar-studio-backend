import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockImagenAPI = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<Buffer[]>>(),
);
const mockGetFileReference = vi.hoisted(() => vi.fn());
const mockAddImageToLibrary = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<string>>(),
);
const mockGetPermanentUrl = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => string>(),
);
const mockFetchGeneratedAvatars = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockDeductCredits = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<number>>(),
);
const mockAddCredits = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);
const mockSharedGetStream = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockGetAvatarById = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(),
);
const mockUploadImage = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>(),
);

vi.mock('../providers/imagen.provider.js', () => ({
  imagenAPI: mockImagenAPI,
}));

vi.mock('../avatars.repository.js', () => ({
  getFileReference: mockGetFileReference,
  addImageToLibrary: mockAddImageToLibrary,
  getPermanentUrl: mockGetPermanentUrl,
  fetchGeneratedAvatars: mockFetchGeneratedAvatars,
  getAvatarById: mockGetAvatarById,
  uploadImage: mockUploadImage,
}));

vi.mock('@/modules/users/service/user.service.js', () => ({
  deductCredits: mockDeductCredits,
  addCredits: mockAddCredits,
}));

vi.mock('./avatar-shared.service.js', () => ({
  getAvatarStream: mockSharedGetStream,
}));

import {
  generateImages,
  getGeneratedAvatars,
  getAvatarStream,
  uploadEditedAvatar,
} from './avatar-generator.service.js';
import { STYLE_TEMPLATES } from '../avatars.utils.js';
import {
  InternalServerError,
  NotFoundError,
} from '@/utils/errors/ApiErrors.js';

const mockFile = {
  save: vi.fn<(...args: unknown[]) => Promise<void>>(),
  createReadStream: vi.fn(),
};

describe('generateImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileReference.mockReturnValue(mockFile);
    mockGetPermanentUrl.mockReturnValue('https://storage.example.com/img.png');
    mockFile.save.mockResolvedValue(undefined);
    mockAddImageToLibrary.mockResolvedValue('doc-id-abc');
  });

  it('deducts 1 credit and returns generated URLs on success', async () => {
    mockDeductCredits.mockResolvedValue(4);
    mockImagenAPI.mockResolvedValue([Buffer.from('fake-png-bytes')]);

    const result = await generateImages('a cat', 'user-123');

    expect(mockDeductCredits).toHaveBeenCalledWith('user-123', 1);
    expect(mockImagenAPI).toHaveBeenCalledWith(expect.any(String));
    expect(result.generatedAvatarUrls).toHaveLength(1);
    expect(result.remainingCredits).toBe(4);
    expect(result.message).toBe('Images generated and stored successfully');
  });

  it('saves the image to storage and adds it to the library', async () => {
    mockDeductCredits.mockResolvedValue(3);
    mockImagenAPI.mockResolvedValue([Buffer.from('bytes')]);

    await generateImages('a dog', 'user-456');

    expect(mockFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png' }),
    );
    expect(mockAddImageToLibrary).toHaveBeenCalledWith(
      'user-456',
      expect.objectContaining({
        prompt: 'a dog',
        extension: 'png',
        url: 'https://storage.example.com/img.png',
      }),
    );
  });

  it('refunds 1 credit when imagenAPI throws', async () => {
    mockDeductCredits.mockResolvedValue(4);
    mockImagenAPI.mockRejectedValue(new Error('Imagen API down'));

    await expect(generateImages('a cat', 'user-123')).rejects.toThrow(
      'Imagen API down',
    );

    expect(mockAddCredits).toHaveBeenCalledWith('user-123', 1);
  });

  it('refunds 1 credit when imagenAPI returns an empty array', async () => {
    mockDeductCredits.mockResolvedValue(4);
    mockImagenAPI.mockResolvedValue([]);

    await expect(generateImages('a cat', 'user-123')).rejects.toThrow(
      InternalServerError,
    );

    expect(mockAddCredits).toHaveBeenCalledWith('user-123', 1);
  });

  it('does NOT refund when deductCredits itself fails', async () => {
    mockDeductCredits.mockRejectedValue(new Error('Insufficient credits.'));

    await expect(generateImages('a cat', 'user-123')).rejects.toThrow(
      'Insufficient credits.',
    );

    expect(mockAddCredits).not.toHaveBeenCalled();
  });
});

describe('getGeneratedAvatars', () => {
  it('delegates to avatarRepo.fetchGeneratedAvatars', async () => {
    const fakeAvatars = [{ id: '1', url: 'https://x.com/a.png' }];
    mockFetchGeneratedAvatars.mockResolvedValue(fakeAvatars);

    const result = await getGeneratedAvatars('user-123');

    expect(mockFetchGeneratedAvatars).toHaveBeenCalledWith('user-123');
    expect(result).toBe(fakeAvatars);
  });
});

describe('getAvatarStream', () => {
  it('calls avatarSharedService with the correct storage path', async () => {
    const fakeStream = { pipe: vi.fn() };
    mockSharedGetStream.mockResolvedValue(fakeStream);

    const result = await getAvatarStream('user-789', 'image-123.png');

    expect(mockSharedGetStream).toHaveBeenCalledWith(
      'image-123.png',
      'users/user-789/generated-avatars/image-123.png',
    );
    expect(result).toBe(fakeStream);
  });
});

describe('generateImages — style templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileReference.mockReturnValue(mockFile);
    mockGetPermanentUrl.mockReturnValue('https://storage.example.com/img.png');
    mockFile.save.mockResolvedValue(undefined);
    mockAddImageToLibrary.mockResolvedValue('doc-id-abc');
    mockDeductCredits.mockResolvedValue(4);
    mockImagenAPI.mockResolvedValue([Buffer.from('bytes')]);
  });

  it.each(
    Object.keys(STYLE_TEMPLATES).filter((k) => k !== 'none') as Exclude<
      keyof typeof STYLE_TEMPLATES,
      'none'
    >[],
  )('injects the %s style lines into the prompt', async (style) => {
    await generateImages('a person', 'user-1', style);

    expect(mockImagenAPI).toHaveBeenCalledWith(
      expect.stringContaining(STYLE_TEMPLATES[style]),
    );
  });

  it('falls back to the "none" style when style is omitted', async () => {
    await generateImages('a person', 'user-1');

    expect(mockImagenAPI).toHaveBeenCalledWith(
      expect.stringContaining(STYLE_TEMPLATES.none),
    );
  });

  it('uses the "none" style when style is explicitly "none"', async () => {
    await generateImages('a person', 'user-1', 'none');

    expect(mockImagenAPI).toHaveBeenCalledWith(
      expect.stringContaining(STYLE_TEMPLATES.none),
    );
  });
});

const FAKE_ORIGINAL_AVATAR = {
  url: 'https://storage.example.com/original.png',
  prompt: 'anime ninja',
  storagePath: 'users/user-123/generated-avatars/original.png',
  extension: 'png' as const,
  createdAt: new Date(),
};

const FAKE_FILE = {
  buffer: Buffer.from('fake-edited-image'),
  mimetype: 'image/png',
  originalname: 'edited.png',
} as Express.Multer.File;

describe('uploadEditedAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvatarById.mockResolvedValue(FAKE_ORIGINAL_AVATAR);
    mockUploadImage.mockResolvedValue(undefined);
    mockGetPermanentUrl.mockReturnValue(
      'https://storage.example.com/edited.png',
    );
    mockAddImageToLibrary.mockResolvedValue('new-avatar-doc-id');
    mockDeductCredits.mockResolvedValue(4);
  });

  it('throws NotFoundError when the original avatar does not exist', async () => {
    mockGetAvatarById.mockResolvedValue(undefined);

    await expect(
      uploadEditedAvatar('user-123', 'bad-id', FAKE_FILE),
    ).rejects.toThrow(NotFoundError);

    expect(mockDeductCredits).not.toHaveBeenCalled();
  });

  it('deducts 1 credit after validating the avatar', async () => {
    await uploadEditedAvatar('user-123', 'avatar-abc', FAKE_FILE);

    expect(mockGetAvatarById).toHaveBeenCalledWith('avatar-abc', 'user-123');
    expect(mockDeductCredits).toHaveBeenCalledWith('user-123', 1);
  });

  it('uploads the file and saves the doc with correct base fields', async () => {
    await uploadEditedAvatar('user-123', 'avatar-abc', FAKE_FILE);

    expect(mockUploadImage).toHaveBeenCalledWith(
      expect.stringContaining('users/user-123/generated-avatars/'),
      FAKE_FILE,
      expect.any(String),
    );
    expect(mockAddImageToLibrary).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        prompt: 'anime ninja',
        extension: 'png',
        url: 'https://storage.example.com/edited.png',
      }),
    );
  });

  it('includes adjustments and preset in the saved doc when provided', async () => {
    const adjustments = { brightness: 0.79, contrast: 0 };

    await uploadEditedAvatar(
      'user-123',
      'avatar-abc',
      FAKE_FILE,
      adjustments,
      'invert',
    );

    expect(mockAddImageToLibrary).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ adjustments, preset: 'invert' }),
    );
  });

  it('omits adjustments and preset from the saved doc when not provided', async () => {
    await uploadEditedAvatar('user-123', 'avatar-abc', FAKE_FILE);

    expect(mockAddImageToLibrary).toHaveBeenCalledWith(
      'user-123',
      expect.not.objectContaining({
        adjustments: expect.anything(),
        preset: expect.anything(),
      }),
    );
  });

  it('returns avatarId, url, prompt, extension and remainingCredits', async () => {
    const result = await uploadEditedAvatar(
      'user-123',
      'avatar-abc',
      FAKE_FILE,
    );

    expect(result).toEqual({
      avatar: expect.objectContaining({
        avatarId: 'new-avatar-doc-id',
        url: 'https://storage.example.com/edited.png',
        prompt: 'anime ninja',
        extension: 'png',
      }),
      remainingCredits: 4,
    });
  });

  it('includes adjustments and preset in the return value when provided', async () => {
    const adjustments = { brightness: 0.5 };

    const result = await uploadEditedAvatar(
      'user-123',
      'avatar-abc',
      FAKE_FILE,
      adjustments,
      'grayscale',
    );

    expect(result.avatar).toMatchObject({ adjustments, preset: 'grayscale' });
  });

  it('refunds 1 credit when the upload fails', async () => {
    mockUploadImage.mockRejectedValue(new Error('Storage unavailable'));

    await expect(
      uploadEditedAvatar('user-123', 'avatar-abc', FAKE_FILE),
    ).rejects.toThrow('Storage unavailable');

    expect(mockAddCredits).toHaveBeenCalledWith('user-123', 1);
  });

  it('does NOT refund when deductCredits itself fails', async () => {
    mockDeductCredits.mockRejectedValue(new Error('Insufficient credits.'));

    await expect(
      uploadEditedAvatar('user-123', 'avatar-abc', FAKE_FILE),
    ).rejects.toThrow('Insufficient credits.');

    expect(mockAddCredits).not.toHaveBeenCalled();
  });
});
