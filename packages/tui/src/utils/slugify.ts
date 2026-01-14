/**
 * Slugify Utilities
 *
 * Convert titles to URL-safe slugs and ensure uniqueness.
 */

/**
 * Convert a title to a URL-safe slug.
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim leading/trailing hyphens
 *
 * @example
 * slugify("Add User Auth!") // "add-user-auth"
 * slugify("Fix Bug #123")   // "fix-bug-123"
 */
export function slugify(title: string): string {
  if (!title || !title.trim()) {
    return '';
  }

  return title
    .toLowerCase()
    // Remove accents/diacritics by decomposing and removing combining marks
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure slug is unique by appending -2, -3, etc. if needed.
 *
 * @example
 * ensureUniqueSlug("my-story", ["my-story", "other"]) // "my-story-2"
 * ensureUniqueSlug("my-story", ["my-story", "my-story-2"]) // "my-story-3"
 */
export function ensureUniqueSlug(slug: string, existingSlugs: string[]): string {
  if (!slug) {
    return '';
  }

  // Normalize to lowercase for comparison
  const normalizedSlugs = existingSlugs.map((s) => s.toLowerCase());
  const normalizedSlug = slug.toLowerCase();

  // If no conflict, return original
  if (!normalizedSlugs.includes(normalizedSlug)) {
    return slug;
  }

  // Find next available number
  let counter = 2;
  while (normalizedSlugs.includes(`${normalizedSlug}-${counter}`)) {
    counter++;
  }

  return `${slug}-${counter}`;
}
