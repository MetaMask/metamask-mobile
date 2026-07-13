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
 * `signingKey` is 32 bytes because it is used directly as the Ed25519
 * private key (for Ed25519 the 32-byte seed *is* the private key).
 */
export const UKYC_DERIVED_KEY_SIZES = {
  storageId: 32,
  dataEncryptionKey: 32,
  signingKey: 32,
  relayTunnelKey: 32,
} as const;

/**
 * HKDF `info` labels providing domain separation between the values derived
 * from `local_user_secret`.
 */
export const UKYC_KDF_INFO = {
  storageId: 'metamask.ukyc.storage.v1.storage_id',
  dataEncryptionKey: 'metamask.ukyc.storage.v1.data_encryption_key',
  signingKey: 'metamask.ukyc.storage.v1.signing_key',
  relayTunnelKey: 'metamask.ukyc.storage.v1.relay_tunnel_key',
} as const;

/**
 * Version bound into every `storage_access_token` payload.
 */
export const UKYC_STORAGE_ACCESS_TOKEN_VERSION = 1;

/**
 * Audience bound into every `storage_access_token` payload, scoping the
 * capability to the UKYC user-storage service.
 */
export const UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE =
  'metamask:user-storage:ukyc' as const;
