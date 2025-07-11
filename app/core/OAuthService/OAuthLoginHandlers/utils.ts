export function toBase64UrlSafe(base64String: string): string {
  return base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '');
}

export function fromBase64UrlSafe(base64String: string): string {
  return base64String
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64String.length + ((4 - (base64String.length % 4)) % 4), '=');
}
