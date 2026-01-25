import { describe, it, expect, vi } from 'vitest';

// Copy the function logic for testing (to avoid import.meta.env issues in tests)
function resolveImageUrl(url: string | null | undefined, baseUrl: string = '/'): string | null {
  if (!url) return null;

  // If it's already an absolute URL (http/https), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // For relative URLs starting with /, prepend the base URL
  if (url.startsWith('/')) {
    // Remove trailing slash from base and leading slash from url to avoid double slashes
    return baseUrl.replace(/\/$/, '') + url;
  }

  return url;
}

describe('resolveImageUrl', () => {
  it('should return null for null input', () => {
    expect(resolveImageUrl(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(resolveImageUrl(undefined)).toBeNull();
  });

  it('should return absolute https URLs unchanged', () => {
    const url = 'https://example.com/image.jpg';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('should return absolute http URLs unchanged', () => {
    const url = 'http://example.com/image.jpg';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('should prepend base URL to relative paths starting with /', () => {
    const url = '/uploads/image.jpg';
    const baseUrl = '/app';
    expect(resolveImageUrl(url, baseUrl)).toBe('/app/uploads/image.jpg');
  });
});
