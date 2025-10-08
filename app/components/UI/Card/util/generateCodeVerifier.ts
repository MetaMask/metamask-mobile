import Crypto from 'react-native-quick-crypto';

const dec2hex = (dec: number): string =>
  ('0' + dec.toString(16)).substring(0, 2);

const generateCodeVerifier = (): string => {
  const array = new Uint32Array(56 / 2);
  Crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join('');
};

const sha256 = (plain: string): Promise<ArrayBuffer> => {
  // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return Crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
};

const base64urlencode = (a: ArrayBuffer): string => {
  let str = '';
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');
};

const challengeFromVerifier = async (v: string): Promise<string> => {
  const hashed = await sha256(v);
  const base64encoded = base64urlencode(hashed);
  return base64encoded;
};

export { generateCodeVerifier, challengeFromVerifier };
