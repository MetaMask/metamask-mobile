import { bytesToString, hexToBytes } from '@metamask/utils';
import { NativeModules } from 'react-native';
import { ShaAlgorithm } from './constants';
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
  const Aes = NativeModules.Aes;
  const derivedKey = await Aes.pbkdf2(
    bytesToString(password),
    bytesToString(salt),
    iterations,
    bytesLengthToBitsLength(keyLength),
    ShaAlgorithm.Sha512,
  );

  return hexToBytes(derivedKey);
};

export { pbkdf2 };
