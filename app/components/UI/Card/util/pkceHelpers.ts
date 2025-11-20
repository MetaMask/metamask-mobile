import QuickCrypto from 'react-native-quick-crypto';

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

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

export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await QuickCrypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '');
}

export async function generatePKCEPair(): Promise<PKCEPair> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

export function validateCodeVerifier(verifier: string): boolean {
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  const validChars = /^[A-Za-z0-9\-._~]+$/;
  return validChars.test(verifier);
}

export function generateState(): string {
  return generateRandomString(32);
}
