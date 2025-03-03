import Crypto from 'react-native-quick-crypto';
import { scrypt } from 'react-native-fast-crypto';
import storageWrapper from '../../../../store/storage-wrapper';
import { SCRYPT_COMPUTED_KEY } from '../../../../constants/storage';
import Logger from '../../../../util/Logger';

export const generateKeyHash = (
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
  return Crypto.createHash('sha256').update(combined).digest('hex');
};

export async function calculateScryptKey(
  passwd: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  size: number,
): Promise<Uint8Array> {
  const generateNewKey = (): string =>
    generateKeyHash(passwd, salt, N, r, p, size);

  // Get persisted key
  try {
    const persistedKey: string | null = await storageWrapper.getItem(
      SCRYPT_COMPUTED_KEY,
    );
    const data: { cacheHash: string; key: string } | null = persistedKey
      ? JSON.parse(persistedKey)
      : null;
    const newKeyHash = generateNewKey();
    if (data?.cacheHash === newKeyHash) {
      return Uint8Array.from(Buffer.from(data.key, 'hex'));
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error(
      new Error('calculateScryptKey - Unable to get cached scrypt key'),
      errorMessage,
    );
  }

  const result = await scrypt(passwd, salt, N, r, p, size);

  // Set Persisted Key
  try {
    const newKeyHash = generateNewKey();
    const resultStr = Buffer.from(result).toString('hex');
    await storageWrapper.setItem(
      SCRYPT_COMPUTED_KEY,
      JSON.stringify({ cacheHash: newKeyHash, key: resultStr }),
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Logger.error(
      new Error('calculateScryptKey - Unable to set cached scrypt key'),
      errorMessage,
    );
  }

  return result;
}
