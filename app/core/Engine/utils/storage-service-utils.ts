/**
 * Utility functions for StorageService key encoding/decoding.
 *
 * These functions handle the quirks of redux-persist-filesystem-storage:
 * 1. `/` in keys creates subdirectories, making keys unreachable via getAllKeys
 * 2. `-` gets converted to `:` by fromFileName, corrupting the key
 *
 * We encode `-` and `/` but not `:` because we already have keys with colons
 * in production (like `tokensChainsCache:0x1`), so encoding `:` would break
 * existing data.
 *
 * We use URI-style encoding (%XX) for these characters because it's a
 * well-understood, reversible format.
 */

/**
 * Encode a string to avoid issues with redux-persist-filesystem-storage.
 *
 * @param key - The string to encode (namespace or key).
 * @returns The encoded string safe for filesystem storage.
 */
export const encodeStorageKey = (key: string): string =>
  key
    .replace(/%/g, '%25') // Encode % first to avoid double-encoding
    .replace(/\//g, '%2F') // Encode slashes (would create subdirectories)
    .replace(/-/g, '%2D'); // Encode hyphens (would be converted to colons)

/**
 * Decode a key that was encoded with encodeStorageKey.
 *
 * @param encodedKey - The encoded key to decode.
 * @returns The original key.
 */
export const decodeStorageKey = (encodedKey: string): string =>
  encodedKey.replace(/%2D/gi, '-').replace(/%2F/gi, '/').replace(/%25/g, '%');
