import { describe, it, expect } from 'vitest';
import {
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { generatedImageConverter } from './converter.js';
import type { GeneratedImage } from './types.js';

describe('generatedImageConverter', () => {
  describe('toFirestore', () => {
    it('returns all fields as a plain object', () => {
      const image = {
        url: 'https://example.com/img.png',
        prompt: 'a cat',
        storagePath: 'users/u1/generated-avatars/img.png',
        extension: 'png' as const,
        createdAt: new Date('2024-01-01'),
      };

      const result = generatedImageConverter.toFirestore(image);

      expect(result['url']).toBe(image.url);
      expect(result['prompt']).toBe(image.prompt);
      expect(result['storagePath']).toBe(image.storagePath);
      expect(result['extension']).toBe('png');
      expect(result['createdAt']).toBe(image.createdAt);
    });

    it('uses serverTimestamp when createdAt is not provided', () => {
      const image = {
        url: 'https://example.com/img.png',
        prompt: 'a cat',
        storagePath: 'users/u1/img.png',
        extension: 'png' as const,
        createdAt: undefined as unknown as Date,
      } as GeneratedImage;

      const result = generatedImageConverter.toFirestore(image);

      // FieldValue.serverTimestamp() is truthy even though it's a sentinel
      expect(result['createdAt']).toBeTruthy();
    });
  });

  describe('fromFirestore', () => {
    it('converts Firestore Timestamp to JS Date', () => {
      const expectedDate = new Date('2024-06-15T10:00:00.000Z');
      const fakeSnapshot = {
        data: () => ({
          url: 'https://example.com/img.png',
          prompt: 'a robot',
          storagePath: 'users/u1/generated-avatars/img.png',
          extension: 'png',
          createdAt: Timestamp.fromDate(expectedDate),
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = generatedImageConverter.fromFirestore(fakeSnapshot);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect((result.createdAt as Date).toISOString()).toBe(
        expectedDate.toISOString(),
      );
    });

    it('falls back to new Date() when createdAt is missing', () => {
      const before = Date.now();
      const fakeSnapshot = {
        data: () => ({
          url: 'https://example.com/img.png',
          prompt: 'a cat',
          storagePath: 'users/u1/img.png',
          extension: 'png',
          createdAt: null,
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = generatedImageConverter.fromFirestore(fakeSnapshot);
      const after = Date.now();

      expect(result.createdAt).toBeInstanceOf(Date);
      const ts = (result.createdAt as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('maps all other fields correctly', () => {
      const fakeSnapshot = {
        data: () => ({
          url: 'https://example.com/img.png',
          prompt: 'a dog',
          storagePath: 'users/u2/generated-avatars/dog.png',
          extension: 'png',
          createdAt: Timestamp.now(),
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = generatedImageConverter.fromFirestore(fakeSnapshot);

      expect(result.url).toBe('https://example.com/img.png');
      expect(result.prompt).toBe('a dog');
      expect(result.storagePath).toBe('users/u2/generated-avatars/dog.png');
      expect(result.extension).toBe('png');
    });
  });
});
