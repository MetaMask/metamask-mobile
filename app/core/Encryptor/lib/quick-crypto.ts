import Crypto from 'react-native-quick-crypto';
import { bytesToHex, remove0x } from '@metamask/utils';
import { EncryptionLibrary, KeyDerivationOptions } from './../types';

class QuickCryptoLib implements EncryptionLibrary {
  /**
   * Generates a random IV (Initialization Vector) of the specified size.
   * Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way).
   * See: https://www.npmjs.com/package/react-native-aes-crypto#example
   * @param size - The size of the IV in bytes.
   * @returns A promise that resolves to the generated IV as a hex string.
   */
  generateIV = async (size: number): Promise<string> => {
    const randomValues = await Crypto.getRandomValues(new Uint8Array(size));
    const hexString = bytesToHex(randomValues);
    return remove0x(hexString);
  };

  /**
   * Derives a key based on a password and some other parameters (KDF).
   * @param password - The password used to generate the key.
   * @param salt - The salt used during key generation.
   * @param opts - KDF options used during key generation.
   * @returns A promise that resolves to the generated key as a base64 string.
   */
  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    const passBuffer = Buffer.from(password, 'utf-8');
    const saltBuffer = Buffer.from(salt, 'utf-8');

    const baseKey = await Crypto.subtle.importKey(
      'raw',
      passBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );

    const derivedBits = await Crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: opts.params.iterations,
        hash: 'SHA-512',
      },
      baseKey,
      256
    );

    const key = await Crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return this.exportKey('raw', key);
  };

  /**
   * Encrypts data using the derived key and IV.
   * @param data - The data to encrypt.
   * @param key - The encryption key.
   * @param iv - The IV.
   * @returns A promise that resolves to the encrypted data as a base64 string.
   */
  encrypt = async (data: string, key: string, iv: Buffer): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'utf-8');
    const cryptoKey = await this.importKey(key);

    const encryptedData = await Crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      dataBuffer
    );
    return encryptedData;
  };

  /**
   * Decrypts data using the derived key and IV.
   * @param data - The encrypted data to decrypt.
   * @param key - The decryption key.
   * @param iv - The IV.
   * @returns A promise that resolves to the decrypted data as a string.
   */
  decrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'base64');
    const ivBuffer = Buffer.from(iv, 'hex');
    const cryptoKey = await this.importKey(key);

    const decryptedData = await Crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBuffer },
      cryptoKey,
      dataBuffer,
    );
    return decryptedData;
  };

  /**
   * Imports a key from a base64 string.
   * @param key - The key to import as a base64 string.
   * @returns A promise that resolves to the imported key.
   */
  importKey = async (key: string): Promise<unknown> => {
    const keyBuffer = Buffer.from(key, 'base64');
    const importedKey = await Crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    return importedKey;
  };

  /**
   * Exports a key to a base64 string.
   * @param importFormat - The format to export the key in ('raw' or 'jwk').
   * @param key - The key to export.
   * @returns A promise that resolves to the exported key as a base64 string.
   */
  exportKey = async (importFormat: 'raw' | 'jwk', key: unknown): Promise<unknown> => {
    const keyBuffer = await Crypto.subtle.exportKey(importFormat, key);
    const base64Key = Buffer.from(keyBuffer).toString('base64');
    return base64Key;
  };
}

export const quickCryptoLib = new QuickCryptoLib();
