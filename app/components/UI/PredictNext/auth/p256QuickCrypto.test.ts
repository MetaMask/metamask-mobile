import { p256 } from '@noble/curves/nist';
import QuickCrypto, { type JWK } from 'react-native-quick-crypto';

import { generateP256Key } from './p256QuickCrypto';

// The global stub returns fixed bytes. QuickCrypto's Jest mock forwards to
// node:crypto. This file covers JWK leading-zero padding, which is an encoding
// edge inside the helper rather than a screen or controller seam.
jest.mock('react-native-quick-crypto', () =>
  jest.requireActual('react-native-quick-crypto/jest'),
);

const ECDSA_P256 = { name: 'ECDSA', namedCurve: 'P-256' } as const;

const bytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/u, '');

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return new Uint8Array(
    Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
  );
};

/**
 * Drops leading zero bytes, matching a JWK encoder that omits them.
 * Keeps one byte so a zero scalar stays representable.
 */
const omitLeadingZeros = (bytes: Uint8Array): Uint8Array => {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) {
    start += 1;
  }
  return bytes.subarray(start);
};

describe('generateP256Key', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('left-pads a JWK private scalar that omitted leading zeros', async () => {
    const secret = new Uint8Array(32);
    secret[1] = 0x11;
    secret[31] = 0x22;
    const point = p256.getPublicKey(secret, false);
    const x = bytesToBase64Url(point.subarray(1, 33));
    const y = bytesToBase64Url(point.subarray(33));
    const privateKey = await QuickCrypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', d: bytesToBase64Url(secret), x, y },
      ECDSA_P256,
      true,
      ['sign'],
    );
    const publicKey = await QuickCrypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x, y },
      ECDSA_P256,
      true,
      ['verify'],
    );
    const exportKey = QuickCrypto.subtle.exportKey.bind(QuickCrypto.subtle);
    let exportedScalarLength = 32;

    jest.spyOn(QuickCrypto.subtle, 'generateKey').mockResolvedValue({
      privateKey,
      publicKey,
    });
    jest
      .spyOn(QuickCrypto.subtle, 'exportKey')
      .mockImplementation(async (format, key) => {
        const exported = await exportKey(format, key);
        if (
          format !== 'jwk' ||
          exported instanceof ArrayBuffer ||
          !exported.d
        ) {
          return exported;
        }
        const stripped = omitLeadingZeros(fromBase64Url(exported.d));
        exportedScalarLength = stripped.length;
        const shortened: JWK = {
          ...exported,
          d: bytesToBase64Url(stripped),
        };
        return shortened;
      });

    const material = await generateP256Key();

    expect(exportedScalarLength).toBe(31);
    expect(material.secretKey).toEqual(secret);
    expect(material.publicRaw).toEqual(point);
    expect(p256.getPublicKey(material.secretKey, false)).toEqual(
      material.publicRaw,
    );
  });
});
