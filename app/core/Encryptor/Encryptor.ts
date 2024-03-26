import { NativeModules } from 'react-native';
import {
  SHA256_DIGEST_LENGTH,
  OLD_NUMBER_ITERATIONS,
  ENCRYPTION_LIBRARY,
} from './constants';
import type { EncryptionResult } from './types';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

/**
 * The Encryptor class provides methods for encrypting and
 * decrypting data objects using AES encryption with native libraries.
 * It supports generating a salt, deriving an encryption key from a
 * password and salt, and performing the encryption and decryption processes.
 */
class Encryptor {
  key: string | null = null;

  /**
   * Generates a base64-encoded salt string.
   * @param byteCount - The number of bytes for the salt. Defaults to 32.
   * @returns The base64-encoded salt string.
   */
  private _generateSalt(byteCount = 32) {
    const view = new Uint8Array(byteCount);
    global.crypto.getRandomValues(view);
    const b64encoded = btoa(String.fromCharCode.apply(null, Array.from(view)));
    return b64encoded;
  }

  /**
   * Generates an encryption key based on the provided password, salt, and library choice.
   * @param params.password - The password used for key derivation.
   * @param params.salt - The salt used for key derivation.
   * @param params.lib - The library to use ('original' or forked version).
   * @returns A promise that resolves to the derived encryption key.
   */
  private _generateKey = ({
    password,
    salt,
    rounds,
    lib,
  }: {
    password: string;
    salt: string;
    rounds: number;
    lib: string;
  }) =>
    lib === ENCRYPTION_LIBRARY.original
      ? Aes.pbkdf2(password, salt, rounds, SHA256_DIGEST_LENGTH)
      : AesForked.pbkdf2(password, salt);

  /**
   * Wrapper method for key generation from a password.
   * @param params.password - The password used for key derivation.
   * @param params.salt - The salt used for key derivation.
   * @param params.lib - The library to use ('original' or forked version).
   * @returns A promise that resolves to the derived encryption key.
   */
  private _keyFromPassword = ({
    password,
    salt,
    rounds,
    lib,
  }: {
    password: string;
    salt: string;
    rounds: number;
    lib: string;
  }): Promise<string> => this._generateKey({ password, salt, rounds, lib });

  /**
   * Encrypts a text string using the provided key.
   * @param params.text - The text to encrypt.
   * @param params.keyBase64 - The base64-encoded encryption key.
   * @returns A promise that resolves to an object containing the cipher text and initialization vector (IV).
   */
  private _encryptWithKey = async ({
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
  private _decryptWithKey = ({
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
  encrypt = async (password: string, object: unknown): Promise<string> => {
    const salt = this._generateSalt(16);
    const key = await this._keyFromPassword({
      password,
      salt,
      rounds: OLD_NUMBER_ITERATIONS,
      lib: ENCRYPTION_LIBRARY.original,
    });
    const result = await this._encryptWithKey({
      text: JSON.stringify(object),
      keyBase64: key,
    });
    result.salt = salt;
    result.lib = ENCRYPTION_LIBRARY.original;
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
  ): Promise<unknown> => {
    console.log({ password, encryptedString });
    const payload = JSON.parse(encryptedString);
    const key = await this._keyFromPassword({
      password,
      salt: payload.salt,
      rounds: OLD_NUMBER_ITERATIONS,
      lib: payload.lib,
    });
    const data = await this._decryptWithKey({
      encryptedData: payload,
      key,
      lib: payload.lib,
    });
    return JSON.parse(data);
  };
}

// eslint-disable-next-line import/prefer-default-export
export { Encryptor };
