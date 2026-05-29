/**
 * Centralised test data factory.
 *
 * All shared user IDs, auth helpers, and data-builder methods live here so
 * that every test file stays DRY. Import the class and call the static
 * members you need:
 *
 *   import { TestFactory } from '@/test/factories.js';
 *
 *   const album = TestFactory.album('my-id');
 *   const res = await request(app).get('/').set(TestFactory.AUTH_HEADER);
 */

import type { Album, AlbumAvatar } from '@/modules/albums/types.js';
import type { GeneratedImage } from '@/modules/avatars/types.js';
import type { UserProfile } from '@/modules/users/types.js';

export class TestFactory {
  // ── Shared user IDs ────────────────────────────────────────────────────────

  /** Used in avatars & users repository integration tests. */
  static readonly USER_ID = 'test-user-repo';

  /** Used in auth repository & service tests. */
  static readonly AUTH_USER_ID = 'test-auth-user';

  /** Primary user ID for albums repository integration tests. */
  static readonly ALBUMS_USER_ID = 'test-albums-user';

  /** Secondary user ID for albums isolation tests (other-user checks). */
  static readonly ALBUMS_OTHER_USER_ID = 'test-albums-other-user';

  /** UID value injected via x-test-uid in all controller integration tests. */
  static readonly CONTROLLER_UID = 'user-123';

  // ── Controller test helpers ────────────────────────────────────────────────

  /**
   * Supertest auth header — pass to `.set(TestFactory.AUTH_HEADER)` on every
   * request that should be treated as authenticated.
   */
  static readonly AUTH_HEADER = {
    'x-test-uid': TestFactory.CONTROLLER_UID,
  } as const;

  // ── Auth user ──────────────────────────────────────────────────────────────

  /**
   * Builds the auth-user shape used by the auth repository and service tests.
   * Pass a custom `uid` for tests that need a specific value (e.g. 'test-uid'
   * in the service suite).
   */
  static authUser(
    uid = TestFactory.AUTH_USER_ID,
    overrides: Partial<{
      uid: string;
      email: string;
      displayName: string;
      emailVerified: boolean;
      picture: string;
    }> = {},
  ) {
    return {
      uid,
      email: 'test@gmail.com',
      displayName: 'Test User',
      emailVerified: false,
      picture: 'http://test_picture',
      ...overrides,
    };
  }

  // ── UserProfile ────────────────────────────────────────────────────────────

  /** Builds a full UserProfile for users repository tests. */
  static userProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      displayName: 'Test User',
      email: 'test@example.com',
      picture: 'http://example.com/avatar.png',
      isPremium: false,
      emailVerified: true,
      createdAt: new Date(),
      credits: 100,
      ...overrides,
    };
  }

  // ── GeneratedImage ─────────────────────────────────────────────────────────

  /**
   * Builds a GeneratedImage.  Defaults to `new Date()` for `createdAt`.
   * Integration tests that need a Firestore server-timestamp sentinel should
   * pass `{ createdAt: FieldValue.serverTimestamp() }` as an override.
   */
  static generatedImage(
    userId = TestFactory.USER_ID,
    overrides: Partial<GeneratedImage> = {},
  ): GeneratedImage {
    return {
      url: 'https://storage.example.com/img.png',
      prompt: 'a cat',
      storagePath: `users/${userId}/generated-avatars/img.png`,
      extension: 'png',
      createdAt: new Date(),
      ...overrides,
    };
  }

  // ── Album ──────────────────────────────────────────────────────────────────

  /**
   * Builds an `Omit<Album, 'id'>` payload — the shape expected by repository
   * write functions where Firestore auto-generates the document ID.
   */
  static albumData(
    userId = TestFactory.ALBUMS_USER_ID,
    overrides: Partial<Omit<Album, 'id'>> = {},
  ): Omit<Album, 'id'> {
    return {
      userId,
      name: 'My Album',
      avatarCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Builds a full `Album` (with a known `id`) for use in unit / controller
   * tests where the repository is mocked and IDs are predetermined.
   */
  static album(id = 'album-abc', overrides: Partial<Album> = {}): Album {
    return {
      id,
      userId: TestFactory.CONTROLLER_UID,
      name: 'My Album',
      avatarCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  // ── AlbumAvatar ────────────────────────────────────────────────────────────

  /**
   * Builds an `Omit<AlbumAvatar, 'id'>` payload for repository integration
   * tests (Firestore generates the document ID).
   */
  static albumAvatarData(
    overrides: Partial<Omit<AlbumAvatar, 'id'>> = {},
  ): Omit<AlbumAvatar, 'id'> {
    return {
      avatarId: 'source-avatar-id',
      url: 'https://example.com/avatar.png',
      prompt: 'a test avatar',
      extension: 'png',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Builds a full `AlbumAvatar` (with a known `id`) for unit / controller
   * tests where the repository is mocked and IDs are predetermined.
   */
  static albumAvatar(
    id = 'avatar-doc-xyz',
    overrides: Partial<AlbumAvatar> = {},
  ): AlbumAvatar {
    return {
      id,
      avatarId: 'source-avatar-id',
      url: 'https://example.com/avatar.png',
      prompt: 'test prompt',
      extension: 'png',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }
}
