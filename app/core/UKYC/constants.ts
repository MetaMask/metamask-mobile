/**
 * Fully-qualified key path for the `user_key` in Encrypted User Storage.
 */
export const UKYC_USER_KEY_PATH = `ukyc.user_key` as const;

/**
 * Size of the `user_key` in bytes. 32 bytes (256 bits) provides high entropy
 * and matches the input length expected by the HKDF-SHA256 derivations below.
 */
export const UKYC_USER_KEY_SIZE_BYTES = 32;

/**
 * Byte length of each value derived from `user_key`.
 *
 * `storageSigningSeed` is 32 bytes because it is used directly as the Ed25519
 * private-key seed for the `storage_signing_key`.
 */
export const UKYC_DERIVED_KEY_SIZES = {
  storageId: 32,
  contentEncryptionKey: 32,
  storageSigningSeed: 32,
  relayTunnelKey: 32,
} as const;

/**
 * HKDF `info` labels providing domain separation between the values derived
 * from `user_key`.
 */
export const UKYC_KDF_INFO = {
  storageId: 'metamask.ukyc.storage.v1.storage_id',
  contentEncryptionKey: 'metamask.ukyc.storage.v1.data_encryption_key',
  storageSigningSeed: 'metamask.ukyc.storage.v1.signing_key',
  relayTunnelKey: 'metamask.ukyc.storage.v1.relay_tunnel_key',
} as const;
