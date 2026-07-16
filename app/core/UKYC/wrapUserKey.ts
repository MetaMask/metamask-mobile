import { gcm } from '@noble/ciphers/aes';
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { hexToBytes } from '@noble/hashes/utils';
import { base64ToBytes } from '@metamask/utils';
import { getRandomBytes } from '../Encryptor/bytes';
import { toBase64Url } from './encoding';

/**
 * Wraps (encrypts) a symmetric key so that only the holder of a given X25519
 * private key can recover it — used to seal the `data_encryption_key` for the
 * idOS Relay before it is handed to the UKYC API as `wrappedUserKey`.
 */

/** X25519 public/private keys and AES-256-GCM keys are all 32 bytes. */
const X25519_KEY_SIZE_BYTES = 32;

/** 96-bit IV, the AES-GCM standard nonce size. */
const IV_SIZE_BYTES = 12;

/**
 * Decodes an X25519 public key presented as either hex or base64/base64url.
 *
 * @param recipientPublicKey - The recipient's 32-byte X25519 public key.
 * @returns The raw 32-byte public key.
 */
function decodePublicKey(recipientPublicKey: string): Uint8Array {
  const isHex =
    recipientPublicKey.length === X25519_KEY_SIZE_BYTES * 2 &&
    /^[0-9a-fA-F]+$/u.test(recipientPublicKey);

  const bytes = isHex
    ? hexToBytes(recipientPublicKey)
    : base64ToBytes(
        recipientPublicKey
          .replace(/-/gu, '+')
          .replace(/_/gu, '/')
          .padEnd(
            recipientPublicKey.length +
              ((4 - (recipientPublicKey.length % 4)) % 4),
            '=',
          ),
      );

  if (bytes.length !== X25519_KEY_SIZE_BYTES) {
    throw new Error(
      `UKYC: wrappingPublicKey has unexpected length ${bytes.length}, expected ${X25519_KEY_SIZE_BYTES}.`,
    );
  }
  return bytes;
}

/**
 * Wraps `keyToWrap` for the holder of `recipientPublicKey` using an
 * ephemeral-static ECDH + AES-256-GCM sealed-box scheme:
 *
 *   ephemeral = fresh X25519 keypair (one per call)
 *   shared    = X25519(ephemeralPrivate, recipientPublic)
 *   aeadKey   = HKDF-SHA256(shared, 32 bytes)
 *   iv        = 12 random bytes
 *   ct        = AES-256-GCM(aeadKey, iv).encrypt(keyToWrap)   // ct includes tag
 *
 * The recipient reverses it with their private key:
 *
 *   shared  = X25519(recipientPrivate, ephemeralPublic)
 *   aeadKey = HKDF-SHA256(shared, 32 bytes)
 *   key     = AES-256-GCM(aeadKey, iv).decrypt(ct)
 *
 * This mirrors the X25519 + AES-256-GCM/HKDF decryption used for MoonPay
 * Check/Auth-frame credentials, so both directions share one primitive.
 *
 * @param recipientPublicKey - The recipient's X25519 public key (hex or base64).
 * @param keyToWrap - The raw symmetric key bytes to encrypt (e.g. the
 * `data_encryption_key`).
 * @returns Base64url of `ephemeralPublicKey(32) || iv(12) || ciphertext+tag`.
 */
export function wrapUserKey(
  recipientPublicKey: string,
  keyToWrap: Uint8Array,
): string {
  const recipient = decodePublicKey(recipientPublicKey);

  const ephemeralPrivateKey = x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);

  const shared = x25519.getSharedSecret(ephemeralPrivateKey, recipient);
  const aeadKey = hkdf(sha256, shared, undefined, undefined, 32);

  const iv = getRandomBytes(IV_SIZE_BYTES);
  const ciphertext = gcm(aeadKey, iv).encrypt(keyToWrap);

  const blob = new Uint8Array(
    ephemeralPublicKey.length + iv.length + ciphertext.length,
  );
  blob.set(ephemeralPublicKey, 0);
  blob.set(iv, ephemeralPublicKey.length);
  blob.set(ciphertext, ephemeralPublicKey.length + iv.length);

  return toBase64Url(blob);
}
