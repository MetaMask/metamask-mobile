import { NativeModules } from 'react-native';
import { ENCRYPTION_LIBRARY, SHA256_DIGEST_LENGTH } from './constants';
import { EncryptionLibrary, KeyDerivationOptions } from './types';

// Actual native libraries
const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

class AesEncryptionLibrary implements EncryptionLibrary {
  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> =>
    await Aes.pbkdf2(
      password,
      salt,
      opts.params.iterations,
      SHA256_DIGEST_LENGTH,
    );

  generateIV = async (size: number): Promise<string> =>
    // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
    // See: https://www.npmjs.com/package/react-native-aes-crypto#example
    await Aes.randomKey(size);

  encrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    await Aes.encrypt(data, key, iv);

  decrypt = async (data: string, key: string, iv: unknown): Promise<string> =>
    await Aes.decrypt(data, key, iv);
}

class AesForkedEncryptionLibrary implements EncryptionLibrary {
  deriveKey = async (
    password: string,
    salt: string,
    _opts: KeyDerivationOptions,
  ): Promise<string> => await AesForked.pbkdf2(password, salt);

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
