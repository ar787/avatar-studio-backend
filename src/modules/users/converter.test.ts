import { describe, it, expect } from 'vitest';
import {
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { userProfileConverter } from './converter.js';
import type { UserProfile } from './types.js';

describe('userProfileConverter', () => {
  describe('toFirestore', () => {
    it('maps all fields to a plain object', () => {
      const profile = {
        email: 'a@example.com',
        displayName: 'Alice',
        picture: 'https://example.com/img.png',
        isPremium: false,
        credits: 10,
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = userProfileConverter.toFirestore(profile);

      expect(result['email']).toBe(profile.email);
      expect(result['displayName']).toBe(profile.displayName);
      expect(result['picture']).toBe(profile.picture);
      expect(result['isPremium']).toBe(false);
      expect(result['credits']).toBe(10);
      expect(result['emailVerified']).toBe(true);
      expect(result['createdAt']).toBe(profile.createdAt);
    });

    it('uses serverTimestamp when createdAt is falsy', () => {
      const profile = {
        email: 'a@example.com',
        displayName: 'Alice',
        picture: '',
        isPremium: false,
        credits: 0,
        emailVerified: false,
        createdAt: undefined,
      } as unknown as UserProfile;

      const result = userProfileConverter.toFirestore(profile);

      // FieldValue.serverTimestamp() is truthy even though it's a sentinel
      expect(result['createdAt']).toBeTruthy();
    });
  });

  describe('fromFirestore', () => {
    it('converts a Firestore Timestamp to a JS Date', () => {
      const expectedDate = new Date('2024-06-15T10:00:00.000Z');
      const fakeSnapshot = {
        data: () => ({
          email: 'a@example.com',
          displayName: 'Alice',
          picture: 'https://example.com/img.png',
          isPremium: false,
          credits: 5,
          emailVerified: true,
          createdAt: Timestamp.fromDate(expectedDate),
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = userProfileConverter.fromFirestore(fakeSnapshot);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect((result.createdAt as Date).toISOString()).toBe(
        expectedDate.toISOString(),
      );
    });

    it('falls back to new Date() when createdAt is null', () => {
      const before = Date.now();
      const fakeSnapshot = {
        data: () => ({
          email: 'a@example.com',
          displayName: 'Alice',
          picture: '',
          isPremium: false,
          credits: 0,
          emailVerified: false,
          createdAt: null,
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = userProfileConverter.fromFirestore(fakeSnapshot);
      const after = Date.now();

      expect(result.createdAt).toBeInstanceOf(Date);
      const ts = (result.createdAt as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('maps all non-date fields correctly', () => {
      const fakeSnapshot = {
        data: () => ({
          email: 'b@example.com',
          displayName: 'Bob',
          picture: 'https://example.com/bob.png',
          isPremium: true,
          credits: 99,
          emailVerified: true,
          createdAt: Timestamp.now(),
        }),
      } as unknown as QueryDocumentSnapshot;

      const result = userProfileConverter.fromFirestore(fakeSnapshot);

      expect(result.email).toBe('b@example.com');
      expect(result.displayName).toBe('Bob');
      expect(result.picture).toBe('https://example.com/bob.png');
      expect(result.isPremium).toBe(true);
      expect(result.credits).toBe(99);
      expect(result.emailVerified).toBe(true);
    });
  });
});
