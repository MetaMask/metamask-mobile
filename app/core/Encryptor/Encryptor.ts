import { NativeModules } from 'react-native';
import { hasProperty, isPlainObject, Json } from '@metamask/utils';
import {
  SALT_BYTES_COUNT,
  SHA256_DIGEST_LENGTH,
  ENCRYPTION_LIBRARY,
  KeyDerivationIteration,
} from './constants';
import type {
  EncryptionResult,
  KeyDerivationOptions,
  GenericEncryptor,
} from './types';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

/**
 * Checks if the provided object is a `KeyDerivationOptions`.
 *
 * @param derivationOptions - The object to check.
 * @returns Whether or not the object is a `KeyDerivationOptions`.
 */
const isKeyDerivationOptions = (
  derivationOptions: unknown,
): derivationOptions is KeyDerivationOptions =>
  isPlainObject(derivationOptions) &&
  hasProperty(derivationOptions, 'algorithm') &&
  hasProperty(derivationOptions, 'params');

/**
 * The Encryptor class provides methods for encrypting and
 * decrypting data objects using AES encryption with native libraries.
 * It supports generating a salt, deriving an encryption key from a
 * password and salt, and performing the encryption and decryption processes.
 */
class Encryptor implements GenericEncryptor {
  /**
   * The key derivation parameters used for encryption and decryption operations.
   * These parameters include the algorithm and its specific parameters, for example, number of iterations for key derivation.
   * They are set during the construction of the Encryptor instance and used for generating encryption keys.
   * @property derivationParams - The key derivation options.
   */
  private derivationParams: KeyDerivationOptions;

  /**
   * Constructs an instance of the Encryptor class.
   * @param params - An object containing key derivation parameters.
   * @param params.derivationParams - The key derivation options to use for encryption and decryption operations.
   * @throws Error if the provided iterations in `derivationParams` do not meet the minimum required.
   */
  constructor({
    derivationParams,
  }: {
    derivationParams: KeyDerivationOptions;
  }) {
    this.checkMinimalRequiredIterations(derivationParams.params.iterations);
    this.derivationParams = derivationParams;
  }

  /**
   * Throws an error if the provided number of iterations does not meet the minimum required for key derivation.
   * This method ensures that the key derivation process is secure by enforcing a minimum number of iterations.
   * @param iterations - The number of iterations to check.
   * @throws Error if the number of iterations is less than the minimum required.
   */
  private checkMinimalRequiredIterations = (iterations: number): void => {
    if (!this.isMinimalRequiredIterationsMet(iterations)) {
      throw new Error(
        `Invalid key derivation iterations: ${iterations}. Recommended number of iterations is ${KeyDerivationIteration.Default}. Minimum required is ${KeyDerivationIteration.Minimum}.`,
      );
    }
  };

  /**
   * Checks if the provided number of iterations meets the minimum required for key derivation.
   * @param iterations - The number of iterations to check.
   * @returns A boolean indicating whether the minimum required iterations are met.
   */
  private isMinimalRequiredIterationsMet = (iterations: number): boolean =>
    iterations >= KeyDerivationIteration.Minimum;

  /**
   * Generates a random base64-encoded salt string.
   * @param byteCount - The number of bytes for the salt. Defaults to `constant.SALT_BYTES_COUNT`.
   * @returns The base64-encoded salt string.
   */
  private generateSalt = (saltBytesCount = SALT_BYTES_COUNT) => {
    const salt = new Uint8Array(saltBytesCount);
    // @ts-expect-error - globalThis is not recognized by TypeScript
    global.crypto.getRandomValues(salt);
    return salt;
  };

  /**
   * Encodes a byte array to a base64 string.
   * @param byteArray The byte array to encode.
   * @returns The base64-encoded string.
   */
  private encodeByteArrayToBase64 = (byteArray: Uint8Array): string =>
    btoa(String.fromCharCode.apply(null, Array.from(byteArray)));

  /**
   * Wrapper method for key generation from a password.
   * @param params.password - The password used for key derivation.
   * @param params.salt - The salt used for key derivation.
   * @param params.lib - The library to use ('original' or forked version).
   * @returns A promise that resolves to the derived encryption key.
   */
  private generateKeyFromPassword = ({
    password,
    salt,
    iterations,
    lib,
  }: {
    password: string;
    salt: string;
    iterations: number;
    lib: string;
  }): Promise<string> =>
    lib === ENCRYPTION_LIBRARY.original
      ? Aes.pbkdf2(password, salt, iterations, SHA256_DIGEST_LENGTH)
      : AesForked.pbkdf2(password, salt);

  /**
   * Encrypts a text string using the provided key.
   * @param params.text - The text to encrypt.
   * @param params.keyBase64 - The base64-encoded encryption key.
   * @returns A promise that resolves to an object containing the cipher text and initialization vector (IV).
   */
  private encryptWithKey = async ({
    text,
    keyBase64,
  }: {
    text: string;
    keyBase64: string;
  }): Promise<EncryptionResult> => {
    const iv = await Aes.randomKey(16);
    return Aes.encrypt(text, keyBase64, iv).then((cipher: string) => ({
      cipher,
      iv,
    }));
  };

  /**
   * Decrypts encrypted data using the provided key.
   * @param params.encryptedData - The encrypted data object containing the cipher text and IV.
   * @param params.key - The decryption key.
   * @param params.lib - The library to use ('original' or forked version) for decryption.
   * @returns A promise that resolves to the decrypted text.
   */
  private decryptWithKey = ({
    encryptedData,
    key,
    lib,
  }: {
    encryptedData: { cipher: string; iv: string };
    key: string;
    lib: string;
  }): Promise<string> =>
    lib === ENCRYPTION_LIBRARY.original
      ? Aes.decrypt(encryptedData.cipher, key, encryptedData.iv)
      : AesForked.decrypt(encryptedData.cipher, key, encryptedData.iv);

  /**
   * Asynchronously encrypts a given object using AES encryption.
   * The encryption process involves generating a salt, deriving a key from the provided password and salt,
   * and then using the key to encrypt the object. The result includes the encrypted data, the salt used,
   * and the library version ('original' in this case).
   *
   * @param params.password - The password used for generating the encryption key.
   * @param params.object - The data object to encrypt. It can be of any type, as it will be stringified during the encryption process.
   * @returns A promise that resolves to a string. The string is a JSON representation of an object containing the encrypted data, the salt used for encryption, and the library version.
   */
  encrypt = async (password: string, object: Json): Promise<string> => {
    const salt = this.generateSalt(16);
    const base64salt = this.encodeByteArrayToBase64(salt);
    const key = await this.generateKeyFromPassword({
      password,
      salt: base64salt,
      iterations: this.derivationParams.params.iterations,
      lib: ENCRYPTION_LIBRARY.original,
    });
    const result = await this.encryptWithKey({
      text: JSON.stringify(object),
      keyBase64: key,
    });
    result.salt = base64salt;
    result.lib = ENCRYPTION_LIBRARY.original;
    result.keyMetadata = this.derivationParams;
    return JSON.stringify(result);
  };

  /**
   * Decrypts an encrypted JS object (encryptedString)
   * using a password (and AES decryption with native libraries)
   *
   * @param password - Password used for decryption
   * @param encryptedString - String to decrypt
   * @returns - Promise resolving to decrypted data object
   */
  decrypt = async (
    password: string,
    encryptedString: string,
  ): Promise<Json> => {
    const payload = JSON.parse(encryptedString);
    const key = await this.generateKeyFromPassword({
      password,
      salt: payload.salt,
      iterations:
        payload.keyMetadata?.params.iterations || KeyDerivationIteration.Legacy,
      lib: payload.lib,
    });
    const data = await this.decryptWithKey({
      encryptedData: payload,
      key,
      lib: payload.lib,
    });

    return JSON.parse(data);
  };

  /**
   * Checks if the provided vault is an updated encryption format.
   *
   * @param vault - The vault to check.
   * @param targetDerivationParams - The options to use for key derivation.
   * @returns Whether or not the vault is an updated encryption format.
   */
  isVaultUpdated = (
    vault: string,
    targetDerivationParams = this.derivationParams,
  ): boolean => {
    const { keyMetadata } = JSON.parse(vault);
    return (
      isKeyDerivationOptions(keyMetadata) &&
      keyMetadata.algorithm === targetDerivationParams.algorithm &&
      keyMetadata.params.iterations === targetDerivationParams.params.iterations
    );
  };

  /**
   * Updates the provided vault, re-encrypting
   * data with a safer algorithm if one is available.
   *
   * If the provided vault is already using the latest available encryption method,
   * it is returned as is.
   *
   * @param vault - The vault to update.
   * @param password - The password to use for encryption.
   * @param targetDerivationParams - The options to use for key derivation.
   * @returns A promise resolving to the updated vault.
   */
  updateVault = async (
    vault: string,
    password: string,
    targetDerivationParams = this.derivationParams,
  ): Promise<string> => {
    if (this.isVaultUpdated(vault, targetDerivationParams)) {
      return vault;
    }

    return this.encrypt(password, await this.decrypt(password, vault));
  };
}

// eslint-disable-next-line import/prefer-default-export
export { Encryptor };
