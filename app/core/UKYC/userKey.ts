import { base64ToBytes, bytesToBase64 } from '@metamask/utils';
import Engine from '../Engine';
import { getRandomBytes } from '../Encryptor/bytes';
import {
  UKYC_USER_KEY_PATH,
  UKYC_USER_KEY_SIZE_BYTES,
} from './constants';

/**
 * Orchestrates creation and loading of the UKYC `user_key`.
 *
 * The `user_key` is the root secret for all UKYC client-derived material. It is
 * generated once, on first enrollment, and persisted to MetaMask Encrypted User
 * Storage. Every subsequent value (`storage_id`, `content_encryption_key`,
 * `storage_signing_key`, `relay_tunnel_key`) is derived from it via HKDF — see
 * `deriveClientMaterial`.
 */

/**
 * In-flight `getOrCreateUserKey` calls, keyed by entropy source. Deduplicates
 * concurrent enrollments in a single client session so we never generate and
 * persist two competing `user_key`s for the same source.
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
      'UKYC: UserStorageController is not available. The wallet must be initialised and unlocked before accessing the UKYC user_key.',
    );
  }
  return controller;
}

/**
 * Loads the persisted `user_key` from Encrypted User Storage, if one exists.
 *
 * @param entropySourceId - Optional HD keyring entropy source id, used to scope
 * the key to a specific SRP in multi-SRP wallets. Defaults to the primary SRP.
 * @returns The decoded `user_key` bytes, or `null` if none has been enrolled.
 */
export async function loadUserKey(
  entropySourceId?: string,
): Promise<Uint8Array | null> {
  const controller = getUserStorageController();

  const stored = await controller.performGetStorage(
    UKYC_USER_KEY_PATH,
    entropySourceId,
  );

  if (!stored) {
    return null;
  }

  const userKey = base64ToBytes(stored);

  if (userKey.length !== UKYC_USER_KEY_SIZE_BYTES) {
    throw new Error(
      `UKYC: stored user_key has unexpected length ${userKey.length}, expected ${UKYC_USER_KEY_SIZE_BYTES}.`,
    );
  }

  return userKey;
}

/**
 * Persists a freshly generated `user_key` to Encrypted User Storage.
 *
 * @param userKey - The `user_key` bytes to persist.
 * @param entropySourceId - Optional HD keyring entropy source id.
 */
async function persistUserKey(
  userKey: Uint8Array,
  entropySourceId?: string,
): Promise<void> {
  const controller = getUserStorageController();
  await controller.performSetStorage(
    UKYC_USER_KEY_PATH,
    bytesToBase64(userKey),
    entropySourceId,
  );
}

/**
 * Creates the UKYC `user_key` if it does not already exist, otherwise loads the
 * existing one. This is the single entry point used on UKYC enrollment.
 *
 * The operation is idempotent and safe against concurrent callers in the same
 * session: repeated or parallel calls resolve to the same `user_key` and never
 * generate more than one key for a given entropy source.
 *
 * @param entropySourceId - Optional HD keyring entropy source id, used to scope
 * the key to a specific SRP in multi-SRP wallets. Defaults to the primary SRP.
 * @returns The `user_key` bytes (existing or newly created).
 */
export async function getOrCreateUserKey(
  entropySourceId?: string,
): Promise<Uint8Array> {
  const cacheKey = entropySourceId ?? '';

  const pending = inFlightCreations.get(cacheKey);
  if (pending) {
    return pending;
  }

  const creation = (async () => {
    const existing = await loadUserKey(entropySourceId);
    if (existing) {
      return existing;
    }

    const userKey = getRandomBytes(UKYC_USER_KEY_SIZE_BYTES);
    await persistUserKey(userKey, entropySourceId);

    // Re-read after persisting so that all callers converge on whatever value
    // actually landed in storage (defends against a competing write that may
    // have won the race, e.g. from another device syncing the same feature).
    return (await loadUserKey(entropySourceId)) ?? userKey;
  })();

  inFlightCreations.set(cacheKey, creation);

  try {
    return await creation;
  } finally {
    inFlightCreations.delete(cacheKey);
  }
}

/**
 * Whether a `user_key` has already been enrolled for the given entropy source.
 *
 * @param entropySourceId - Optional HD keyring entropy source id.
 * @returns `true` if a `user_key` exists in Encrypted User Storage.
 */
export async function hasUserKey(
  entropySourceId?: string,
): Promise<boolean> {
  return (await loadUserKey(entropySourceId)) !== null;
}
