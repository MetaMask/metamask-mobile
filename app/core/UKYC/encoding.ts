import { bytesToBase64 } from '@metamask/utils';

/**
 * Encoding helpers shared across the UKYC client-material and
 * storage-authorization modules.
 */

/**
 * Encodes bytes as unpadded base64url (RFC 4648 §5). This is the wire shape
 * used for `storage_id`, `signing_public_key`, and Ed25519 signatures in the
 * UKYC storage API.
 *
 * @param bytes - The bytes to encode.
 * @returns The base64url string without `=` padding.
 */
export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}
