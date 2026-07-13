import { base64ToBytes, bytesToBase64 } from '@metamask/utils';
import Engine from '../Engine';
import { getRandomBytes } from '../Encryptor/bytes';
import {
  UKYC_LOCAL_USER_SECRET_PATH,
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
} from './constants';

/**
 * Orchestrates creation and loading of the UKYC `local_user_secret`.
 *
 * The `local_user_secret` is the root secret for all UKYC client-derived
 * material. It is generated once, on first enrollment, and persisted to
 * MetaMask Encrypted User Storage. It is never transmitted off the device, not
 * even to the idOS Relay. Every subsequent value (`storage_id`,
 * `data_encryption_key`, `signing_key`, `relay_tunnel_key`) is derived from it
 * via HKDF — see `deriveClientMaterial`.
 */

/**
 * In-flight `getOrCreateLocalUserSecret` calls, keyed by entropy source.
 * Deduplicates concurrent enrollments in a single client session so we never
 * generate and persist two competing `local_user_secret`s for the same source.
 */
const inFlightCreations = new Map<string, Promise<Uint8Array>>();

/**
 * Resolves the `UserStorageController`, which owns the encrypted, SRP-derived
 * user storage. Throws if the Engine has not been initialised yet (e.g. before
 * the keyring is unlocked), so callers get a clear error instead of a
 * `Cannot read properties of undefined`.
 *
 * @returns The `UserStorageController` instance.
 */
function getUserStorageController() {
  const controller = Engine.context?.UserStorageController;
  if (!controller) {
    throw new Error(
      'UKYC: UserStorageController is not available. The wallet must be initialised and unlocked before accessing the UKYC local_user_secret.',
    );
  }
  return controller;
}

/**
 * Loads the persisted `local_user_secret` from Encrypted User Storage, if one
 * exists.
 *
 * @param entropySourceId - Optional HD keyring entropy source id, used to scope
 * the secret to a specific SRP in multi-SRP wallets. Defaults to the primary SRP.
 * @returns The decoded `local_user_secret` bytes, or `null` if none has been
 * enrolled.
 */
export async function loadLocalUserSecret(
  entropySourceId?: string,
): Promise<Uint8Array | null> {
  const controller = getUserStorageController();

  const stored = await controller.performGetStorage(
    UKYC_LOCAL_USER_SECRET_PATH,
    entropySourceId,
  );

  if (!stored) {
    return null;
  }

  const localUserSecret = base64ToBytes(stored);

  if (localUserSecret.length !== UKYC_LOCAL_USER_SECRET_SIZE_BYTES) {
    throw new Error(
      `UKYC: stored local_user_secret has unexpected length ${localUserSecret.length}, expected ${UKYC_LOCAL_USER_SECRET_SIZE_BYTES}.`,
    );
  }

  return localUserSecret;
}

/**
 * Persists a freshly generated `local_user_secret` to Encrypted User Storage.
 *
 * @param localUserSecret - The `local_user_secret` bytes to persist.
 * @param entropySourceId - Optional HD keyring entropy source id.
 */
async function persistLocalUserSecret(
  localUserSecret: Uint8Array,
  entropySourceId?: string,
): Promise<void> {
  const controller = getUserStorageController();
  await controller.performSetStorage(
    UKYC_LOCAL_USER_SECRET_PATH,
    bytesToBase64(localUserSecret),
    entropySourceId,
  );
}

/**
 * Creates the UKYC `local_user_secret` if it does not already exist, otherwise
 * loads the existing one. This is the single entry point used on UKYC
 * enrollment.
 *
 * The operation is idempotent and safe against concurrent callers in the same
 * session: repeated or parallel calls resolve to the same `local_user_secret`
 * and never generate more than one secret for a given entropy source.
 *
 * @param entropySourceId - Optional HD keyring entropy source id, used to scope
 * the secret to a specific SRP in multi-SRP wallets. Defaults to the primary SRP.
 * @returns The `local_user_secret` bytes (existing or newly created).
 */
export async function getOrCreateLocalUserSecret(
  entropySourceId?: string,
): Promise<Uint8Array> {
  const cacheKey = entropySourceId ?? '';

  const pending = inFlightCreations.get(cacheKey);
  if (pending) {
    return pending;
  }

  const creation = (async () => {
    const existing = await loadLocalUserSecret(entropySourceId);
    if (existing) {
      return existing;
    }

    const localUserSecret = getRandomBytes(UKYC_LOCAL_USER_SECRET_SIZE_BYTES);
    await persistLocalUserSecret(localUserSecret, entropySourceId);

    // Re-read after persisting so that all callers converge on whatever value
    // actually landed in storage (defends against a competing write that may
    // have won the race, e.g. from another device syncing the same feature).
    return (await loadLocalUserSecret(entropySourceId)) ?? localUserSecret;
  })();

  inFlightCreations.set(cacheKey, creation);

  try {
    return await creation;
  } finally {
    inFlightCreations.delete(cacheKey);
  }
}

/**
 * Whether a `local_user_secret` has already been enrolled for the given entropy
 * source.
 *
 * @param entropySourceId - Optional HD keyring entropy source id.
 * @returns `true` if a `local_user_secret` exists in Encrypted User Storage.
 */
export async function hasLocalUserSecret(
  entropySourceId?: string,
): Promise<boolean> {
  return (await loadLocalUserSecret(entropySourceId)) !== null;
}
