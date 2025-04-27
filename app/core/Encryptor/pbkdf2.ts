import Crypto from 'react-native-quick-crypto';
import { bytesLengthToBitsLength } from '../../util/bytes';

/**
 * Derives a key using PBKDF2.
 *
 * @param password - The password used to generate the key.
 * @param salt - The salt used during key generation.
 * @param iterations - The number of iterations used during key generation.
 * @param keyLength - The length (in bytes) of the key to generate.
 * @returns The generated key.
 */
const pbkdf2 = async (
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keyLength: number,
): Promise<Uint8Array> => {
  const key = await Crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  const derivedBits = await Crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-512' },
    key,
    bytesLengthToBitsLength(keyLength)
  );

  return new Uint8Array(derivedBits);
};

export { pbkdf2 };
