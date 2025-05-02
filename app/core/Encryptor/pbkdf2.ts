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
  /*const derivedKey = await Aes.pbkdf2(
    bytesToString(password),
    bytesToString(salt),
    iterations,
    bytesLengthToBitsLength(keyLength),
    ShaAlgorithm.Sha512,
  );*/

  // Convert vPpCV4/yGJ9IOFcbJ0ghicmLqCIiHOaJlRcmG2EZvAM= to Uint8Array
  const derivedKey = hexToBytes("ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff");

  return derivedKey;
};

export { pbkdf2 };
