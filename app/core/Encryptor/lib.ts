import { NativeModules } from 'react-native';
import {
  KDF_ALGORITHM,
  ShaAlgorithm,
  CipherAlgorithm,
  SHA256_DIGEST_LENGTH,
} from './constants';
import { EncryptionLibrary, KeyDerivationOptions } from './types';

// Actual native libraries
const Aes = NativeModules.Aes;

function checkForKDFAlgorithm(algorithm: string) {
  if (algorithm !== KDF_ALGORITHM) {
    throw new Error('Unsupported KDF algorithm');
  }
}

class AesEncryptionLibrary implements EncryptionLibrary {
  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    checkForKDFAlgorithm(opts.algorithm);

    return await Aes.pbkdf2(
      password,
      salt,
      opts.params.iterations,
      // We're using SHA512 but returning a key with length 256 bits.
      // Truncating the output to 256 bits is intentional and considered safe.
      //
      // References:
      // - https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
      // - https://eprint.iacr.org/2010/548.pdf
      SHA256_DIGEST_LENGTH,
      ShaAlgorithm.Sha512,
    );
  };

  generateIV = async (size: number): Promise<string> =>
    // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
    // See: https://www.npmjs.com/package/react-native-aes-crypto#example
    await Aes.randomKey(size);

  encrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    await Aes.encrypt(data, key, iv, CipherAlgorithm.cbc);

  decrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    await Aes.decrypt(data, key, iv, CipherAlgorithm.cbc);
}

// Those wrappers are stateless, we can build them only once!
export const AesLib = new AesEncryptionLibrary();

export function getEncryptionLibrary(): EncryptionLibrary {
  return AesLib;
}
