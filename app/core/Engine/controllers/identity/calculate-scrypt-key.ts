import Crypto from 'react-native-quick-crypto';
import { scrypt } from 'react-native-fast-crypto';
import {
  ACCESSIBLE,
  getGenericPassword,
  setGenericPassword,
} from 'react-native-keychain';
import Logger from '../../../../util/Logger';

const LOCAL_KEY_PERSISTENCE = 'com.metamask.local-key-cache';
const defaultKeychainOptions = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const cacheKeyFromParams = (
  passwd: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  size: number,
): string => {
  const combined = new Uint8Array([
    ...passwd,
    ...salt,
    ...new Uint8Array([N, r, p, size]),
  ]);
  const paramHash = Crypto.createHash('sha256').update(combined).digest('hex');
  return `${LOCAL_KEY_PERSISTENCE}.${paramHash}`;
};

/**
 * Computes a scrypt key from a password and salt, and caches the result in the Keychain
 * for future reuse.
 * @param passwd - The password to derive the key from
 * @param salt - The salt to use in the derivation
 * @param N - CPU/memory cost parameter (must be a power of 2, > 1) - see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
 * @param r - Block size parameter - usually 8
 * @param p - Parallelization parameter
 * @param size - The size of the derived key (bytes)
 */
export async function calculateScryptKey(
  passwd: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  size: number,
): Promise<Uint8Array> {
  // Generate a hash of the parameters which acts as a cache key
  const cacheKey = cacheKeyFromParams(passwd, salt, N, r, p, size);
  // Try to get a previously derived Key from the Keychain
  try {
    const persistedKey = await getGenericPassword({
      service: cacheKey,
    });
    if (persistedKey) {
      return Uint8Array.from(Buffer.from(persistedKey.password, 'hex'));
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error(
      new Error('calculateScryptKey - Unable to get cached scrypt key'),
      errorMessage,
    );
  }

  // If no key is found, derive it
  const derivedKey: Uint8Array = await scrypt(passwd, salt, N, r, p, size);

  // and persist the derived Key in the Keychain
  try {
    const resultStr = Buffer.from(derivedKey).toString('hex');
    await setGenericPassword('metamask-user', resultStr, {
      service: cacheKey,
      ...defaultKeychainOptions,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error(
      new Error('calculateScryptKey - Unable to set cached scrypt key'),
      errorMessage,
    );
  }

  return derivedKey;
}
