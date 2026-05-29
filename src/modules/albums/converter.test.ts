import { describe, it, expect } from 'vitest';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { albumConverter, albumAvatarConverter } from './converter.js';
import type { Album, AlbumAvatar } from './types.js';

// ── helpers ────────────────────────────────────────────────────────────────

function makeSnapshot(
  id: string,
  data: Record<string, unknown>,
): QueryDocumentSnapshot {
  return { id, data: () => data } as unknown as QueryDocumentSnapshot;
}

function makeTimestamp(date: Date) {
  return { toDate: () => date };
}

// ── albumConverter ─────────────────────────────────────────────────────────

describe('albumConverter.toFirestore', () => {
  const BASE: Album = {
    id: 'album-1',
    userId: 'user-1',
    name: 'My Album',
    avatarCount: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  it('maps required fields correctly', () => {
    const result = albumConverter.toFirestore(BASE);

    expect(result['userId']).toBe('user-1');
    expect(result['name']).toBe('My Album');
    expect(result['avatarCount']).toBe(3);
  });

  it('does not include the id field', () => {
    const result = albumConverter.toFirestore(BASE);
    expect(result).not.toHaveProperty('id');
  });

  it('includes description when provided', () => {
    const result = albumConverter.toFirestore({
      ...BASE,
      description: 'A test album',
    });
    expect(result['description']).toBe('A test album');
  });

  it('omits description when undefined', () => {
    const result = albumConverter.toFirestore(BASE);
    expect(result).not.toHaveProperty('description');
  });

  it('omits description when empty string', () => {
    const result = albumConverter.toFirestore({ ...BASE, description: '' });
    expect(result).not.toHaveProperty('description');
  });

  it('includes coverImageUrl when provided', () => {
    const result = albumConverter.toFirestore({
      ...BASE,
      coverImageUrl: 'https://example.com/cover.png',
    });
    expect(result['coverImageUrl']).toBe('https://example.com/cover.png');
  });

  it('omits coverImageUrl when undefined', () => {
    const result = albumConverter.toFirestore(BASE);
    expect(result).not.toHaveProperty('coverImageUrl');
  });

  it('omits coverImageUrl when empty string', () => {
    const result = albumConverter.toFirestore({ ...BASE, coverImageUrl: '' });
    expect(result).not.toHaveProperty('coverImageUrl');
  });

  it('uses the provided createdAt date', () => {
    const result = albumConverter.toFirestore(BASE);
    expect(result['createdAt']).toEqual(new Date('2024-01-01'));
  });

  it('always overwrites updatedAt with a server timestamp sentinel', () => {
    const result = albumConverter.toFirestore(BASE);
    // updatedAt is always set to FieldValue.serverTimestamp() — never the input
    expect(result['updatedAt']).toBeDefined();
    expect(result['updatedAt']).not.toEqual(BASE.updatedAt);
  });
});

describe('albumConverter.fromFirestore', () => {
  const createdAt = new Date('2024-01-01');
  const updatedAt = new Date('2024-06-01');

  it('maps all fields from the snapshot correctly', () => {
    const snap = makeSnapshot('album-1', {
      userId: 'user-1',
      name: 'My Album',
      description: 'desc',
      coverImageUrl: 'https://example.com/cover.png',
      avatarCount: 5,
      createdAt: makeTimestamp(createdAt),
      updatedAt: makeTimestamp(updatedAt),
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.id).toBe('album-1');
    expect(result.userId).toBe('user-1');
    expect(result.name).toBe('My Album');
    expect(result.description).toBe('desc');
    expect(result.coverImageUrl).toBe('https://example.com/cover.png');
    expect(result.avatarCount).toBe(5);
  });

  it('converts createdAt Timestamp to a Date', () => {
    const snap = makeSnapshot('album-1', {
      userId: 'u',
      name: 'n',
      avatarCount: 0,
      createdAt: makeTimestamp(createdAt),
      updatedAt: makeTimestamp(updatedAt),
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(createdAt.getTime());
  });

  it('converts updatedAt Timestamp to a Date', () => {
    const snap = makeSnapshot('album-1', {
      userId: 'u',
      name: 'n',
      avatarCount: 0,
      createdAt: makeTimestamp(createdAt),
      updatedAt: makeTimestamp(updatedAt),
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBe(updatedAt.getTime());
  });

  it('falls back to a new Date when createdAt is missing', () => {
    const before = Date.now();
    const snap = makeSnapshot('album-1', {
      userId: 'u',
      name: 'n',
      avatarCount: 0,
      createdAt: null,
      updatedAt: makeTimestamp(updatedAt),
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('falls back to a new Date when updatedAt is missing', () => {
    const before = Date.now();
    const snap = makeSnapshot('album-1', {
      userId: 'u',
      name: 'n',
      avatarCount: 0,
      createdAt: makeTimestamp(createdAt),
      updatedAt: null,
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('passes through undefined description and coverImageUrl', () => {
    const snap = makeSnapshot('album-1', {
      userId: 'u',
      name: 'n',
      avatarCount: 0,
      createdAt: makeTimestamp(createdAt),
      updatedAt: makeTimestamp(updatedAt),
    });

    const result = albumConverter.fromFirestore(snap);

    expect(result.description).toBeUndefined();
    expect(result.coverImageUrl).toBeUndefined();
  });
});

// ── albumAvatarConverter ───────────────────────────────────────────────────

describe('albumAvatarConverter.toFirestore', () => {
  const BASE: AlbumAvatar = {
    id: 'avatar-doc-1',
    avatarId: 'source-avatar-id',
    url: 'https://example.com/avatar.png',
    prompt: 'a prompt',
    extension: 'png',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('maps all avatar fields correctly', () => {
    const result = albumAvatarConverter.toFirestore(BASE);

    expect(result['avatarId']).toBe('source-avatar-id');
    expect(result['url']).toBe('https://example.com/avatar.png');
    expect(result['prompt']).toBe('a prompt');
    expect(result['extension']).toBe('png');
    expect(result['createdAt']).toBe('2024-01-01T00:00:00.000Z');
  });

  it('does not include the id field', () => {
    const result = albumAvatarConverter.toFirestore(BASE);
    expect(result).not.toHaveProperty('id');
  });
});

describe('albumAvatarConverter.fromFirestore', () => {
  const ISO = '2024-01-01T00:00:00.000Z';

  it('maps all fields from the snapshot correctly', () => {
    const snap = makeSnapshot('avatar-doc-1', {
      avatarId: 'source-avatar-id',
      url: 'https://example.com/avatar.png',
      prompt: 'a prompt',
      extension: 'png',
      createdAt: ISO,
    });

    const result = albumAvatarConverter.fromFirestore(snap);

    expect(result.id).toBe('avatar-doc-1');
    expect(result.avatarId).toBe('source-avatar-id');
    expect(result.url).toBe('https://example.com/avatar.png');
    expect(result.prompt).toBe('a prompt');
    expect(result.extension).toBe('png');
  });

  it('keeps createdAt as a string (no Timestamp conversion)', () => {
    const snap = makeSnapshot('avatar-doc-1', {
      avatarId: 'a',
      url: 'u',
      prompt: 'p',
      extension: 'png',
      createdAt: ISO,
    });

    const result = albumAvatarConverter.fromFirestore(snap);

    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe(ISO);
  });
});
