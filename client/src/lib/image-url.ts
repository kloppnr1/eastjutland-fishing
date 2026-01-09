export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If it's already an absolute URL (http/https), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // For relative URLs starting with /, prepend the base URL
  if (url.startsWith('/')) {
    const base = import.meta.env.BASE_URL || '/';
    // Remove trailing slash from base and leading slash from url to avoid double slashes
    return base.replace(/\/$/, '') + url;
  }

  return url;
}
