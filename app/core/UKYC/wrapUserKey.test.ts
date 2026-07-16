import { gcm } from '@noble/ciphers/aes';
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { base64ToBytes, areUint8ArraysEqual } from '@metamask/utils';
import { wrapUserKey } from './wrapUserKey';

const X25519_KEY_SIZE_BYTES = 32;
const IV_SIZE_BYTES = 12;

const DATA_ENCRYPTION_KEY = new Uint8Array(32).fill(7);

/**
 * Decodes the unpadded base64url blob produced by {@link wrapUserKey}.
 *
 * @param value - The base64url-encoded wrapped key.
 * @returns The raw blob bytes.
 */
function fromBase64Url(value: string): Uint8Array {
  return base64ToBytes(
    value
      .replace(/-/gu, '+')
      .replace(/_/gu, '/')
      .padEnd(value.length + ((4 - (value.length % 4)) % 4), '='),
  );
}

/**
 * Reverses {@link wrapUserKey} with the recipient's private key.
 *
 * @param blob - The base64url wrapped key.
 * @param recipientPrivateKey - The recipient's X25519 private key.
 * @returns The recovered plaintext key bytes.
 */
function unwrapUserKey(
  blob: string,
  recipientPrivateKey: Uint8Array,
): Uint8Array {
  const bytes = fromBase64Url(blob);
  const ephemeralPublicKey = bytes.slice(0, X25519_KEY_SIZE_BYTES);
  const iv = bytes.slice(
    X25519_KEY_SIZE_BYTES,
    X25519_KEY_SIZE_BYTES + IV_SIZE_BYTES,
  );
  const ciphertext = bytes.slice(X25519_KEY_SIZE_BYTES + IV_SIZE_BYTES);

  const shared = x25519.getSharedSecret(recipientPrivateKey, ephemeralPublicKey);
  const aeadKey = hkdf(sha256, shared, undefined, undefined, 32);
  return gcm(aeadKey, iv).decrypt(ciphertext);
}

describe('UKYC wrapUserKey', () => {
  it('produces an unpadded base64url blob', () => {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const wrapped = wrapUserKey(bytesToHex(publicKey), DATA_ENCRYPTION_KEY);

    expect(wrapped).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(wrapped).not.toContain('=');
  });

  it('wraps a key the recipient can recover (hex public key)', () => {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const wrapped = wrapUserKey(bytesToHex(publicKey), DATA_ENCRYPTION_KEY);
    const recovered = unwrapUserKey(wrapped, privateKey);

    expect(areUint8ArraysEqual(recovered, DATA_ENCRYPTION_KEY)).toBe(true);
  });

  it('accepts a base64url-encoded public key', () => {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const publicKeyBase64Url = Buffer.from(publicKey)
      .toString('base64')
      .replace(/\+/gu, '-')
      .replace(/\//gu, '_')
      .replace(/=+$/u, '');

    const wrapped = wrapUserKey(publicKeyBase64Url, DATA_ENCRYPTION_KEY);
    const recovered = unwrapUserKey(wrapped, privateKey);

    expect(areUint8ArraysEqual(recovered, DATA_ENCRYPTION_KEY)).toBe(true);
  });

  it('produces a fresh ephemeral key (non-deterministic output) per call', () => {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const first = wrapUserKey(bytesToHex(publicKey), DATA_ENCRYPTION_KEY);
    const second = wrapUserKey(bytesToHex(publicKey), DATA_ENCRYPTION_KEY);

    expect(first).not.toEqual(second);
    expect(
      areUint8ArraysEqual(
        unwrapUserKey(first, privateKey),
        unwrapUserKey(second, privateKey),
      ),
    ).toBe(true);
  });

  it('rejects a public key of the wrong length', () => {
    expect(() => wrapUserKey('abcd', DATA_ENCRYPTION_KEY)).toThrow(
      'unexpected length',
    );
  });
});
