import { hasProperty, isPlainObject, Json } from '@metamask/utils';
import {
  KeyDerivationIteration,
  SALT_BYTES_COUNT,
  ENCRYPTION_LIBRARY,
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  LEGACY_DERIVATION_OPTIONS,
} from './constants';
import type {
  WithKeyEncryptor,
  EncryptionKey,
  EncryptionResult,
  KeyDerivationOptions,
} from './types';
import { getEncryptionLibrary } from './lib';

// Add these interfaces near the top with the other types
interface DetailedDecryptResult {
  exportedKeyString: string;
  vault: unknown;
  salt: string;
}

interface DetailedEncryptionResult {
  vault: string;
  exportedKeyString: string;
}

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
 * Checks if the provided object is a `EncryptionKey`.
 *
 * @param key - The object to check.
 * @returns Whether or not the object is a `EncryptionKey`.
 */
const isEncryptionKey = (key: unknown): key is EncryptionKey =>
  isPlainObject(key) &&
  hasProperty(key, 'key') &&
  hasProperty(key, 'lib') &&
  hasProperty(key, 'keyMetadata') &&
  isKeyDerivationOptions(key.keyMetadata);

/**
 * The Encryptor class provides methods for encrypting and
 * decrypting data objects using AES encryption with native libraries.
 * It supports generating a salt, deriving an encryption key from a
 * password and salt, and performing the encryption and decryption processes.
 */
class Encryptor implements WithKeyEncryptor<EncryptionKey, Json> {
  /**
   * The key derivation parameters used for encryption and decryption operations.
   * These parameters include the algorithm and its specific parameters, for example, number of iterations for key derivation.
   * They are set during the construction of the Encryptor instance and used for generating encryption keys.
   *
   * @property derivationParams - The key derivation options.
   */
  private keyDerivationOptions: KeyDerivationOptions;

  /**
   * Constructs an instance of the Encryptor class.
   *
   * @param params - An object containing key derivation parameters.
   * @param params.keyDerivationOptions - The key derivation options to use for encryption and decryption operations.
   */
  constructor({
    keyDerivationOptions,
  }: {
    keyDerivationOptions: KeyDerivationOptions;
  }) {
    this.checkMinimalRequiredIterations(keyDerivationOptions.params.iterations);
    this.keyDerivationOptions = keyDerivationOptions;
  }

  /**
   * Generates a random base64-encoded salt string.
   * @param size - The number of bytes for the salt. Defaults to `constant.SALT_BYTES_COUNT`.
   * @returns The base64-encoded salt string.
   */
  generateSalt = (size: number = SALT_BYTES_COUNT) => {
    const view = new Uint8Array(size);
    global.crypto.getRandomValues(view);

    // From: https://github.com/MetaMask/browser-passworder/blob/main/src/index.ts#L418
    // Uint8Array is a fixed length array and thus does not have methods like pop, etc
    // so TypeScript complains about casting it to an array. Array.from() works here for
    // getting the proper type, but it results in a functional difference. In order to
    // cast, you have to first cast view to unknown then cast the unknown value to number[]
    // TypeScript ftw: double opt in to write potentially type-mismatched code.
    return btoa(String.fromCharCode.apply(null, view as unknown as number[]));
  };

  /**
   * Generate an encryption key from a password and random salt, specifying
   * key derivation options.
   *
   * @param password - The password to use to generate key.
   * @param salt - The salt string to use in key derivation.
   * @param [exportable] - True if the key is exportable.
   * @param [opts] - The options to use for key derivation.
   * @param [lib] - The library or algorithm used for encryption. Defaults to `ENCRYPTION_LIBRARY.original`.
   * @returns An EncryptionKey for encryption and decryption.
   */
  keyFromPassword = async (
    password: string,
    salt: string,
    exportable = false,
    opts: KeyDerivationOptions = this.keyDerivationOptions,
    lib = ENCRYPTION_LIBRARY.original,
  ): Promise<EncryptionKey> => {
    const key = await getEncryptionLibrary(lib).deriveKey(password, salt, opts);

    return {
      key,
      keyMetadata: opts,
      exportable,
      lib,
    };
  };

  /**
   * Encrypts a text string using the provided key.
   *
   * @param key - The encryption key to encrypt with.
   * @param data - The data to encrypt.
   * @returns A promise that resolves to an object containing the cipher text and initialization vector (IV).
   */
  //@ts-expect-error - TODO: will be implemented at the keyring controller the support for this key type
  encryptWithKey = async (
    key: EncryptionKey,
    data: Json,
  ): Promise<EncryptionResult> => {
    const text = JSON.stringify(data);

    const lib = getEncryptionLibrary(key.lib);
    const iv = await lib.generateIV(16);
    const cipher = await lib.encrypt(text, key.key, iv);

    return {
      cipher,
      iv,
      keyMetadata: key.keyMetadata,
      lib: key.lib,
    };
  };

  /**
   * Decrypts the given encrypted string with the given encryption key.
   *
   * @param key - The encryption key to decrypt with.
   * @param payload - The encrypted payload to decrypt.
   * @returns The decrypted object.
   */
  //@ts-expect-error - TODO: will be implemented at the keyring controller the support for this key type
  decryptWithKey = async (
    key: EncryptionKey,
    payload: EncryptionResult,
  ): Promise<unknown> => {
    // TODO: Check for key and payload compatibility?

    // We assume that both `payload.lib` and `key.lib` are the same here!
    const lib = getEncryptionLibrary(payload.lib);
    const text = await lib.decrypt(payload.cipher, key.key, payload.iv);

    return JSON.parse(text);
  };

  /**
   * Asynchronously encrypts a given object using AES encryption.
   * The encryption process involves generating a salt, deriving a key from the provided password and salt,
   * and then using the key to encrypt the object. The result includes the encrypted data, the salt used,
   * and the library version ('original' in this case).
   *
   * @param password - The password used for generating the encryption key.
   * @param data - The data object to encrypt. It can be of any type, as it will be stringified during the encryption process.
   * @returns A promise that resolves to a string. The string is a JSON representation of an object containing the encrypted data, the salt used for encryption, and the library version.
   */
  encrypt = async (password: string, data: Json): Promise<string> => {
    const salt = this.generateSalt(16);
    const key = await this.keyFromPassword(
      password,
      salt,
      false,
      this.keyDerivationOptions,
      ENCRYPTION_LIBRARY.original,
    );

    // NOTE: When re-encrypting, we always use the original library and the KDF parameters from
    // the encryptor itself. This makes sure we always re-encrypt with the "latest" and "best"
    // setup possible.
    const result = await this.encryptWithKey(key, data);
    result.lib = key.lib; // Use the same library as the one used for key generation!
    result.salt = salt;
    result.keyMetadata = key.keyMetadata;
    return JSON.stringify(result);
  };

  /**
   * Decrypts an encrypted JS object (as a JSON string)
   * using a password (and AES decryption with native libraries)
   *
   * @param password - Password used for decryption
   * @param text - String to decrypt
   * @returns - Promise resolving to decrypted data object
   */
  decrypt = async (password: string, text: string): Promise<unknown> => {
    const payload = JSON.parse(text);
    const { salt, keyMetadata, lib } = payload;

    // NOTE: We use metadata coming from the payload itself as the encryption
    // scheme/parameters could be different:
    // - The encryption library might be different (forked vs original)
    // - The KDF parameters could be:
    //   * the legacy one (if not present in the payload)
    //   * use a different number of iterations for the KDF
    const key = await this.keyFromPassword(
      password,
      salt,
      false,
      // If the keyMetadata is not present, we can assume the key was derived using the legacy options
      keyMetadata || LEGACY_DERIVATION_OPTIONS,
      lib,
    );

    return await this.decryptWithKey(key, payload);
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
    targetDerivationParams = this.keyDerivationOptions,
  ): boolean => {
    const { keyMetadata } = JSON.parse(vault);

    return (
      isKeyDerivationOptions(keyMetadata) &&
      keyMetadata.algorithm === targetDerivationParams.algorithm &&
      keyMetadata.params.iterations === targetDerivationParams.params.iterations
    );
  };

  /**
   * Exports a key string from an `EncryptionKey` instance.
   *
   * @param key - The `EncryptionKey` to export.
   * @returns A key string.
   */
  exportKey = async (key: EncryptionKey): Promise<string> => {
    if (!key.exportable) {
      throw new Error('Key is not exportable');
    }

    const json = JSON.stringify(key);
    return Buffer.from(json).toString('base64');
  };

  /**
   * Receives an exported EncryptionKey string and creates a key.
   *
   * @param keyString - The key string to import.
   * @returns An EncryptionKey.
   */
  importKey = async (keyString: string): Promise<EncryptionKey> => {
    let key;
    try {
      const json = Buffer.from(keyString, 'base64').toString();
      key = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid exported key serialization format');
    }

    if (!isEncryptionKey(key)) {
      throw new Error('Invalid exported key structure');
    }
    return key as EncryptionKey;
  };

  /**
   * Given a password and a cipher text, decrypts the text and returns
   * the resulting value, keyString, and salt.
   *
   * @param password - The password to decrypt with.
   * @param text - The encrypted vault to decrypt.
   * @returns The decrypted vault along with the salt and exported key.
   */
  decryptWithDetail = async (
    password: string,
    text: string,
  ): Promise<DetailedDecryptResult> => {
    const payload = JSON.parse(text);
    const { salt, keyMetadata } = payload;
    const key = await this.keyFromPassword(
      password,
      salt,
      true,
      // If the keyMetadata is not present, we can assume the key was derived using the legacy options
      keyMetadata || LEGACY_DERIVATION_OPTIONS,
      payload.lib,
    );
    const exportedKeyString = await this.exportKey(key);
    const vault = await this.decryptWithKey(key, payload);

    return {
      exportedKeyString,
      vault,
      salt,
    };
  };

  /**
   * Encrypts a data object that can be any serializable value using
   * a provided password.
   *
   * @param password - A password to use for encryption.
   * @param dataObj - The data to encrypt.
   * @param salt - The salt used to encrypt.
   * @param keyDerivationOptions - The options to use for key derivation.
   * @returns The vault and exported key string.
   */
  encryptWithDetail = async (
    password: string,
    dataObj: Json,
    salt = this.generateSalt(),
    keyDerivationOptions = this.keyDerivationOptions,
  ): Promise<DetailedEncryptionResult> => {
    const key = await this.keyFromPassword(
      password,
      salt,
      true,
      keyDerivationOptions,
      ENCRYPTION_LIBRARY.original,
    );
    const exportedKeyString = await this.exportKey(key);

    const result = await this.encryptWithKey(key, dataObj);
    result.salt = salt;
    result.keyMetadata = key.keyMetadata;
    const vault = JSON.stringify(result);

    return {
      vault,
      exportedKeyString,
    };
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
      targetDerivationParams = this.keyDerivationOptions,
    ): Promise<string> => {
      if (this.isVaultUpdated(vault, targetDerivationParams)) {
        return vault;
      }

      return this.encrypt(password, await this.decrypt(password, vault) as Json);
    };

  /**
   * Throws an error if the provided number of iterations does not meet the minimum required for key derivation.
   * This method ensures that the key derivation process is secure by enforcing a minimum number of iterations.
   * @param iterations - The number of iterations to check.
   * @throws Error if the number of iterations is less than the minimum required.
   */
    private checkMinimalRequiredIterations = (iterations: number): void => {
      if (!this.isMinimalRequiredIterationsMet(iterations)) {
        throw new Error(
          `Invalid key derivation iterations: ${iterations}. Recommended number of iterations is ${KeyDerivationIteration.OWASP2023Default}. Minimum required is ${KeyDerivationIteration.OWASP2023Minimum}.`,
        );
      }
    };

  /**
   * Checks if the provided number of iterations meets the minimum required for key derivation.
   * @param iterations - The number of iterations to check.
   * @returns A boolean indicating whether the minimum required iterations are met.
   */
  private isMinimalRequiredIterationsMet = (iterations: number): boolean =>
    iterations >= KeyDerivationIteration.OWASP2023Minimum;
}

export { Encryptor };
