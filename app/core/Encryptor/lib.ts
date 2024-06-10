import { NativeModules } from 'react-native';
import {
  KDF_ALGORITHM,
  SHA_ALGORITHM,
  CIPHER_ALGORITHM,
  ENCRYPTION_LIBRARY,
  SHA256_DIGEST_LENGTH,
  LEGACY_DERIVATION_OPTIONS,
} from './constants';
import { EncryptionLibrary, KeyDerivationOptions } from './types';

// Actual native libraries
const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

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
      // We're passing a digest of 256 bits but using it with SHA512
      SHA256_DIGEST_LENGTH,
      SHA_ALGORITHM.sha512,
    );
  };

  generateIV = async (size: number): Promise<string> =>
    // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
    // See: https://www.npmjs.com/package/react-native-aes-crypto#example
    await Aes.randomKey(size);

  encrypt = async (
    data: string,
    key: string,
    iv: unknown,
    algorithm: CIPHER_ALGORITHM,
  ): Promise<string> => await Aes.encrypt(data, key, iv, algorithm);

  decrypt = async (
    data: string,
    key: string,
    iv: unknown,
    algorithm: CIPHER_ALGORITHM,
  ): Promise<string> => await Aes.decrypt(data, key, iv, algorithm);
}

class AesForkedEncryptionLibrary implements EncryptionLibrary {
  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    checkForKDFAlgorithm(opts.algorithm);

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

export function getEncryptionLibrary(
  lib: string | undefined,
): EncryptionLibrary {
  return lib === ENCRYPTION_LIBRARY.original ? AesLib : AesForkedLib;
}
