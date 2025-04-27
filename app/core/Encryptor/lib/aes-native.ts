import { NativeModules } from 'react-native';
import {
  KDF_ALGORITHM,
  ShaAlgorithm,
  CipherAlgorithm,
  SHA256_DIGEST_LENGTH,
  LEGACY_DERIVATION_OPTIONS,
} from './../constants';
import { EncryptionLibrary, KeyDerivationOptions } from './../types';

// Actual native libraries
const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

export function checkForKdfAlgorithm(algorithm: string) {
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
    checkForKdfAlgorithm(opts.algorithm);

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

/**
 * This library was mainly used in a legacy context.
 */
class AesForkedEncryptionLibrary implements EncryptionLibrary {
  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    checkForKdfAlgorithm(opts.algorithm);

    // This library was mainly used in a legacy context, meaning the number of iterations/rounds during the
    // key derivation was hard-coded in the native library itself. We do check for those here to make sure
    // the caller is aware of this
    const legacyIterations = LEGACY_DERIVATION_OPTIONS.params.iterations;
    if (opts.params.iterations !== legacyIterations) {
      throw new Error(
        `Invalid number of iterations, should be: ${legacyIterations}`,
      );
    }

    return await AesForked.pbkdf2(password, salt);
  };

  generateIV = async (size: number): Promise<string> =>
    // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
    // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
    // See: https://www.npmjs.com/package/react-native-aes-crypto#example
    await Aes.randomKey(size);

  encrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
    await Aes.encrypt(data, key, iv);

  decrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    await AesForked.decrypt(data, key, iv);
}

// Those wrappers are stateless, we can build them only once!
export const AesLib = new AesEncryptionLibrary();
export const AesForkedLib = new AesForkedEncryptionLibrary();
