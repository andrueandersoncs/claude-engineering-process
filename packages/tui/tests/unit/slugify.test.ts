/**
 * Unit tests for slugify utility.
 *
 * Following TDD: these tests are written BEFORE implementation.
 */

import { describe, it, expect } from 'vitest';
import { slugify, ensureUniqueSlug } from '../../src/utils/slugify';

describe('slugify', () => {
  describe('slugify()', () => {
    it('converts title to lowercase', () => {
      expect(slugify('Add User Auth')).toBe('add-user-auth');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugify('my new story')).toBe('my-new-story');
    });

    it('removes special characters', () => {
      expect(slugify('Add User Auth!')).toBe('add-user-auth');
      expect(slugify("What's New?")).toBe('what-s-new');
    });

    it('removes consecutive hyphens', () => {
      expect(slugify('test---multiple---hyphens')).toBe('test-multiple-hyphens');
    });

    it('trims leading and trailing hyphens', () => {
      expect(slugify('--my-slug--')).toBe('my-slug');
      expect(slugify('  leading spaces  ')).toBe('leading-spaces');
    });

    it('handles numbers in title', () => {
      expect(slugify('Fix Bug #123')).toBe('fix-bug-123');
      expect(slugify('Version 2.0 Release')).toBe('version-2-0-release');
    });

    it('handles punctuation', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('test: with colon')).toBe('test-with-colon');
      expect(slugify('one & two')).toBe('one-two');
    });

    it('handles unicode characters by removing diacritics', () => {
      // Diacritics are removed, base characters preserved
      expect(slugify('café')).toBe('cafe');
      expect(slugify('über')).toBe('uber');
    });

    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(slugify('   ')).toBe('');
    });

    it('handles already-valid slugs', () => {
      expect(slugify('already-valid-slug')).toBe('already-valid-slug');
    });

    it('handles single word', () => {
      expect(slugify('Authentication')).toBe('authentication');
    });
  });

  describe('ensureUniqueSlug()', () => {
    it('returns original slug if no duplicates', () => {
      expect(ensureUniqueSlug('my-story', [])).toBe('my-story');
      expect(ensureUniqueSlug('my-story', ['other-story'])).toBe('my-story');
    });

    it('appends -2 for first duplicate', () => {
      expect(ensureUniqueSlug('my-story', ['my-story'])).toBe('my-story-2');
    });

    it('appends -3 when -2 exists', () => {
      expect(ensureUniqueSlug('my-story', ['my-story', 'my-story-2'])).toBe('my-story-3');
    });

    it('finds next available number', () => {
      expect(
        ensureUniqueSlug('test', ['test', 'test-2', 'test-3', 'test-4'])
      ).toBe('test-5');
    });

    it('handles case-insensitive comparison', () => {
      // Slugs should be compared case-insensitively
      expect(ensureUniqueSlug('my-story', ['My-Story'])).toBe('my-story-2');
    });

    it('handles empty slug', () => {
      // Edge case: empty slug should get a default or return empty
      expect(ensureUniqueSlug('', ['other'])).toBe('');
    });

    it('handles gaps in numbering', () => {
      // If my-story-2 exists but my-story-3 doesn't, use -3
      expect(ensureUniqueSlug('test', ['test', 'test-2', 'test-4'])).toBe('test-3');
    });
  });
});
