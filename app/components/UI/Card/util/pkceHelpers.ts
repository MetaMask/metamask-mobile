import QuickCrypto from 'react-native-quick-crypto';

const ALLOWED_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  QuickCrypto.getRandomValues(array);
  return Array.from(
    array,
    (byte) => ALLOWED_CHARS[byte % ALLOWED_CHARS.length],
  ).join('');
}

export function generateState(): string {
  return generateRandomString(32);
}
