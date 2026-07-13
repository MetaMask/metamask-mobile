/**
 * Fully-qualified key path for the `local_user_secret` in Encrypted User
 * Storage.
 */
export const UKYC_LOCAL_USER_SECRET_PATH = `ukyc.local_user_secret` as const;

/**
 * Size of the `local_user_secret` in bytes. 32 bytes (256 bits) provides high
 * entropy and matches the input length expected by the HKDF-SHA256 derivations
 * below.
 */
export const UKYC_LOCAL_USER_SECRET_SIZE_BYTES = 32;

/**
 * Byte length of each value derived from `local_user_secret`.
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
