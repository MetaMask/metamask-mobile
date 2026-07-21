/**
 * MoonPay Check / Auth frame key exchange & credential decryption.
 *
 * The Identity API guide specifies that the Check and Auth frames return
 * encrypted credentials and references a separate "Check frame key exchange"
 * reference doc for the full protocol. The exact wire format isn't published
 * in the PDF — confirm the envelope shape against the platform docs before
 * production use.
 *
 * The most likely protocol (matching the language of "X25519 key exchange"
 * + "encrypted credentials" in the guide) is NaCl `crypto_box`:
 *
 *   1. Client generates an X25519 keypair, sends `publicKey` (hex) into the
 *      frame as a URL param.
 *   2. Frame generates its own ephemeral X25519 keypair, computes
 *      `shared_secret = X25519(framePrivate, clientPublic)`, derives
 *      `symKey = HSalsa20(shared_secret, zeros_16)`, and encrypts the
 *      credentials with `xsalsa20poly1305(symKey, nonce, plaintext)`.
 *   3. Frame returns `{ ephemeralPublicKey, nonce, ciphertext }` (each base64
 *      or hex). Client reverses to obtain the plaintext credentials.
 *
 * `decryptCredentials` implements that reversal. If MoonPay's actual
 * protocol differs (e.g. sealed box, HKDF + AES-GCM, JWE, etc.), swap out
 * this function — everything above the call boundary (`MoonpayDemo`,
 * `MoonpayFrame`) is protocol-agnostic.
 */

import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/aes';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

// ---------------------------------------------------------------------------
// Keypair
// ---------------------------------------------------------------------------

export interface X25519KeyPair {
  // Raw 32-byte X25519 private (scalar) key.
  privateKey: Uint8Array;
  // Raw 32-byte X25519 public key.
  publicKey: Uint8Array;
  // Hex-encoded public key, ready to drop into a Check/Auth frame URL.
  publicKeyHex: string;
}

/**
 * Generate a fresh X25519 keypair. The private key never leaves the device;
 * only `publicKeyHex` is sent to MoonPay via the frame URL.
 */
export function generateKeyPair(): X25519KeyPair {
  // X25519 (Curve25519 ECDH) keypair. Both keys are 32 bytes. The same curve
  // is used for the ECDH shared secret in `aesGcmDecrypt`.
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    publicKeyHex: bytesToHex(publicKey),
  };
}

// ---------------------------------------------------------------------------
// Credential decryption (NaCl crypto_box)
// ---------------------------------------------------------------------------

// TODO: 

/**
 * The encrypted-credentials envelope as we expect the Check/Auth frames to
 * send it. Accept either hex or base64 for each binary field — different
 * MoonPay services have historically used different encodings.
 */
export interface EncryptedCredentialsEnvelope {
  // Ephemeral public key produced by the frame for this exchange (32 bytes).
  ephemeralPublicKey: string;
  // Per-message nonce/IV. MoonPay names this `iv`; older docs call it
  // `nonce`. Accept either.
  iv?: string;
  nonce?: string;
  // Ciphertext (plaintext length + auth tag).
  ciphertext: string;
  // Optional explicit encoding hint. Defaults to auto-detect.
  encoding?: 'hex' | 'base64';
}

/**
 * Result of decrypting the Check/Auth frame credentials envelope.
 *
 *   - `accessToken` is the Bearer token for the MoonPay Identity API (Steps
 *     4-7). Always present once authenticated.
 *   - `clientToken` is the short-lived token consumed by the Auth frame when
 *     the Check frame returns `connectionRequired`. Present on the Check
 *     frame's `connectionRequired` payload.
 */
export interface DecryptedCredentials {
  accessToken?: string;
  clientToken?: string;
  // The frame may include other fields (refresh token, expiry, etc.). Keep
  // them around for inspection rather than throwing them away.
  [key: string]: unknown;
}

function decodeBinary(value: string, encoding?: 'hex' | 'base64'): Uint8Array {
  const isHex =
    encoding === 'hex' ||
    (encoding === undefined && /^[0-9a-fA-F]+$/.test(value));
  if (isHex) {
    return hexToBytes(value);
  }
  // Base64 / base64url fallback.
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  // eslint-disable-next-line no-undef
  if (typeof atob === 'function') {
    // eslint-disable-next-line no-undef
    const binaryStr = atob(padded);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  // RN / Hermes provides global Buffer via @craftzdog/react-native-buffer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BufferRef = (globalThis as any).Buffer;
  if (BufferRef) {
    return new Uint8Array(BufferRef.from(padded, 'base64'));
  }
  throw new Error('No base64 decoder available in this runtime');
}

/**
 * Coerce the `credentials` field into a structured envelope.
 *
 * The frame may deliver `credentials` either as an object or as a JSON
 * *string* wrapping that object (double-encoding is common once the message
 * has passed through `JSON.stringify` on the way to the WebView bridge). An
 * opaque, non-JSON string would indicate a packed binary blob we don't yet
 * decode — surface that explicitly rather than crashing on `undefined`.
 */
function normalizeEnvelope(
  input: EncryptedCredentialsEnvelope | string,
): EncryptedCredentialsEnvelope {
  let value: unknown = input;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // TODO: this should be a string. verify and clean this up!

    // Case 1: plain JSON object.
    if (trimmed.startsWith('{')) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        throw new Error(
          `credentials looked like JSON but failed to parse (preview: "${trimmed.slice(
            0,
            64,
          )}").`,
        );
      }
    } else {
      // Case 2: base64(JSON) — the common wire form (e.g. a value starting
      // with "eyJ" decodes to '{"...'). Decode the bytes to text and parse.
      let decodedText: string | null = null;
      try {
        decodedText = new TextDecoder().decode(decodeBinary(trimmed, 'base64'));
      } catch {
        decodedText = null;
      }
      const decodedTrimmed = decodedText?.trim();
      if (decodedTrimmed && decodedTrimmed.startsWith('{')) {
        try {
          value = JSON.parse(decodedTrimmed);
        } catch {
          throw new Error(
            `credentials base64-decoded to non-JSON (preview: "${decodedTrimmed.slice(
              0,
              64,
            )}").`,
          );
        }
      } else {
        throw new Error(
          `credentials is an opaque string, not a structured or base64(JSON) envelope (preview: "${trimmed.slice(
            0,
            64,
          )}"). It may be a packed crypto_box blob — confirm the wire format and update decryptCredentials.`,
        );
      }
    }
  }

  const env = value as Partial<EncryptedCredentialsEnvelope>;
  if (!env.ephemeralPublicKey || !(env.iv ?? env.nonce) || !env.ciphertext) {
    const keys =
      value && typeof value === 'object'
        ? Object.keys(value).join(', ')
        : typeof value;
    throw new Error(
      `credentials envelope missing required fields (ephemeralPublicKey/iv/ciphertext). Got: ${keys}`,
    );
  }
  return env as EncryptedCredentialsEnvelope;
}

/**
 * Decode an envelope's binary fields and report their byte lengths. Useful
 * for figuring out which AEAD primitive the frame is using (12-byte IV ⇒
 * AES-GCM, 24-byte nonce ⇒ NaCl crypto_box) without leaking secrets.
 */
export function inspectEnvelope(
  rawEnvelope: EncryptedCredentialsEnvelope | string,
): {
  ephemeralPublicKeyLen: number;
  ivLen: number;
  ciphertextLen: number;
  ivFieldName: 'iv' | 'nonce' | null;
} {
  const envelope = normalizeEnvelope(rawEnvelope);
  const ivFieldName = envelope.iv ? 'iv' : envelope.nonce ? 'nonce' : null;
  const ivField = envelope.iv ?? envelope.nonce ?? '';
  return {
    ephemeralPublicKeyLen: decodeBinary(
      envelope.ephemeralPublicKey,
      envelope.encoding,
    ).length,
    ivLen: ivField ? decodeBinary(ivField, envelope.encoding).length : 0,
    ciphertextLen: decodeBinary(envelope.ciphertext, envelope.encoding).length,
    ivFieldName,
  };
}

/**
 * Result of a successful decryption — the credentials plus the `method` that
 * authenticated, so callers can surface which primitive/derivation was used.
 */
export interface DecryptResult {
  credentials: DecryptedCredentials;
  method: string;
}

/**
 * X25519 ECDH → AES-256-GCM decryption (the "ECDH-ES" pattern signalled by a
 * 12-byte `iv`), matching MoonPay's confirmed Check/Auth-frame protocol:
 *
 *   shared = X25519(ourPrivate, theirEphemeralPublic)
 *   key    = HKDF-SHA256(shared, salt=∅, info=∅, 32 bytes)
 *   plain  = AES-256-GCM.decrypt(key, iv, ciphertext || 16-byte tag)
 *
 * GCM verifies the auth tag and throws on mismatch.
 */
function aesGcmDecrypt(
  theirPublicKey: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  ourPrivateKey: Uint8Array,
): DecryptResult {
  const shared = x25519.getSharedSecret(ourPrivateKey, theirPublicKey);
  const key = hkdf(sha256, shared, undefined, undefined, 32);

  const plaintext = gcm(key, iv).decrypt(ciphertext);
  // eslint-disable-next-line no-undef
  const text = new TextDecoder().decode(plaintext);
  return {
    credentials: JSON.parse(text) as DecryptedCredentials,
    method: 'aes-256-gcm/hkdf-sha256',
  };
}

/**
 * Decrypt a Check/Auth frame credentials envelope using our X25519 private
 * key. Returns the parsed JSON credentials and the method that authenticated.
 *
 * MoonPay's confirmed protocol uses a 12-byte IV with X25519+AES-256-GCM.
 */
export function decryptCredentials(
  rawEnvelope: EncryptedCredentialsEnvelope | string,
  ourPrivateKey: Uint8Array,
): DecryptResult {
  const envelope = normalizeEnvelope(rawEnvelope);

  const theirPublicKey = decodeBinary(
    envelope.ephemeralPublicKey,
    envelope.encoding,
  );
  const ivField = envelope.iv ?? envelope.nonce;
  if (!ivField) {
    throw new Error('credentials envelope missing iv/nonce');
  }
  const iv = decodeBinary(ivField, envelope.encoding);
  const ciphertext = decodeBinary(envelope.ciphertext, envelope.encoding);

  if (iv.length !== 12) {
    throw new Error(
      `Unexpected IV length ${iv.length} (expected 12 for AES-256-GCM). MoonPay's Check/Auth-frame protocol is X25519+AES-256-GCM.`,
    );
  }

  return aesGcmDecrypt(theirPublicKey, iv, ciphertext, ourPrivateKey);
}
