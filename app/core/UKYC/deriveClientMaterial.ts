import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToBase64, stringToBytes } from '@metamask/utils';
import { UKYC_DERIVED_KEY_SIZES, UKYC_KDF_INFO } from './constants';

/**
 * Derives UKYC client material from the root `local_user_secret` using
 * HKDF-SHA256 with domain-separated `info` labels — see the architecture doc,
 * section "Client-Derived Material".
 */

/**
 * The set of values derived from `local_user_secret`.
 */
export interface UkycClientMaterial {
  /** Opaque lookup key for the encrypted KYC object. */
  storageId: Uint8Array;
  /** Key used to encrypt `encrypted_kyc_data` (or wrap per-blob keys). */
  contentEncryptionKey: Uint8Array;
  /** Ed25519 private-key seed backing `storageSigningKey`. */
  storageSigningSeed: Uint8Array;
  /**
   * Ed25519 private key used to authenticate storage GET/PUT/DELETE
   * operations. For Ed25519 the 32-byte seed *is* the private key, so this is
   * identical to {@link storageSigningSeed} and is exposed under the
   * doc-aligned name for clarity at call sites.
   */
  storageSigningKey: Uint8Array;
  /** Public half of `storageSigningKey`, registered with the object. */
  storagePublicKey: Uint8Array;
  /** Key for establishing/authenticating the encrypted tunnel to idOS. */
  relayTunnelKey: Uint8Array;
}

/**
 * The same material with byte fields base64url-encoded, matching the wire
 * shapes in the architecture doc (`storage_id` as an opaque id, public key as a
 * "base64url public key"). Secret material is intentionally omitted.
 */
export interface EncodedUkycClientMaterial {
  storageId: string;
  storagePublicKey: string;
}

/**
 * Derives a single labeled value from `local_user_secret`.
 *
 * No salt is used: `local_user_secret` is already a high-entropy
 * uniformly-random secret, so per-output domain separation comes entirely from
 * the `info` label.
 *
 * @param localUserSecret - The root `local_user_secret` bytes.
 * @param info - Domain-separation label for this output.
 * @param length - Desired output length in bytes.
 * @returns The derived bytes.
 */
function deriveLabeled(
  localUserSecret: Uint8Array,
  info: string,
  length: number,
): Uint8Array {
  return hkdf(sha256, localUserSecret, undefined, stringToBytes(info), length);
}

/**
 * Derives all UKYC client material from the root `local_user_secret`.
 *
 * This is a pure function of `local_user_secret`: the same input always yields
 * the same outputs, which is what makes `storage_id` and `signing_key` stable
 * across sessions and devices.
 *
 * @param localUserSecret - The `local_user_secret` produced by
 * `getOrCreateLocalUserSecret`.
 * @returns The derived {@link UkycClientMaterial}.
 */
export function deriveClientMaterial(
  localUserSecret: Uint8Array,
): UkycClientMaterial {
  const storageId = deriveLabeled(
    localUserSecret,
    UKYC_KDF_INFO.storageId,
    UKYC_DERIVED_KEY_SIZES.storageId,
  );

  const contentEncryptionKey = deriveLabeled(
    UKYC_KDF_INFO.contentEncryptionKey,
    UKYC_DERIVED_KEY_SIZES.contentEncryptionKey,
    localUserSecret,
  );

  const storageSigningSeed = deriveLabeled(
    UKYC_KDF_INFO.storageSigningSeed,
    UKYC_DERIVED_KEY_SIZES.storageSigningSeed,
  );

  const relayTunnelKey = deriveLabeled(
    localUserSecret,
    UKYC_KDF_INFO.relayTunnelKey,
    UKYC_DERIVED_KEY_SIZES.relayTunnelKey,
  );

  const storagePublicKey = ed25519.getPublicKey(storageSigningSeed);

  return {
    storageId,
    contentEncryptionKey,
    storageSigningSeed,
    storageSigningKey: storageSigningSeed, // validate this
    storagePublicKey,
    relayTunnelKey,
  };
}

/**
 * Encodes the non-secret client material into the base64url wire shapes used by
 * the UKYC storage API (`storage_id` and `storage_public_key`).
 *
 * @param material - The derived client material.
 * @returns The base64url-encoded, non-secret fields.
 */
export function encodeClientMaterial(
  material: UkycClientMaterial,
): EncodedUkycClientMaterial {
  return {
    storageId: toBase64Url(material.storageId),
    storagePublicKey: toBase64Url(material.storagePublicKey),
  };
}

/**
 * Encodes bytes as unpadded base64url (RFC 4648 §5).
 *
 * @param bytes - The bytes to encode.
 * @returns The base64url string without `=` padding.
 */
function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}
