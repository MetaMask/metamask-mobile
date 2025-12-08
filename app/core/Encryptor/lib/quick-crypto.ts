import Crypto from 'react-native-quick-crypto';
import { bytesToHex, remove0x } from '@metamask/utils';
import { EncryptionLibrary, KeyDerivationOptions } from './../types';
import { getRandomBytes } from '../bytes';
import { KDF_ALGORITHM } from '../constants';

/**
 * AES cipher algorithm used in QuickCrypto.
 */
export enum CipherAlgorithmQuickCrypto {
  Cbc = 'AES-CBC',
}

/**
 * SHA algorithm used in QuickCrypto.
 */
export enum HashAlgorithmQuickCrypto {
  Sha512 = 'SHA-512',
}

/**
 * Class representing the QuickCrypto encryption library.
 */
class QuickCryptoEncryptionLibrary implements EncryptionLibrary {
  /**
   * Generates a random IV (Initialization Vector) of the specified size.
   * @param size - The size of the IV in bytes.
   * @returns A promise that resolves to the generated IV as a hex string.
   */
  generateIv = async (size: number): Promise<string> => {
    const randomValues = await getRandomBytes(size);
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
    const passBuffer = new TextEncoder().encode(password);

    const baseKey = await Crypto.subtle.importKey(
      'raw',
      passBuffer,
      { name: KDF_ALGORITHM },
      false,
      ['deriveBits', 'deriveKey'],
    );

    const derivedBits = await Crypto.subtle.deriveBits(
      {
        name: KDF_ALGORITHM,
        salt,
        iterations: opts.params.iterations,
        hash: HashAlgorithmQuickCrypto.Sha512,
      },
      baseKey,
      256,
    );

    return Buffer.from(derivedBits).toString('base64');
  };

  /**
   * Encrypts data using the derived key and IV.
   * @param data - The data to encrypt.
   * @param key - The encryption key.
   * @param iv - The IV.
   * @returns A promise that resolves to the encrypted data as a base64 string.
   */
  encrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = new TextEncoder().encode(data);
    const ivBuffer = Buffer.from(iv, 'hex');
    const cryptoKey = await this.importKey(key);

    const encryptedData = await Crypto.subtle.encrypt(
      { name: CipherAlgorithmQuickCrypto.Cbc, iv: ivBuffer },
      // @ts-expect-error - This should be as CryptoKey but the type is not exported
      cryptoKey,
      dataBuffer,
    );
    return Buffer.from(encryptedData).toString('base64');
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
      { name: CipherAlgorithmQuickCrypto.Cbc, iv: ivBuffer },
      // @ts-expect-error - This should be CryptoKey but the type is not exported
      cryptoKey,
      dataBuffer,
    );
    return Buffer.from(decryptedData).toString('utf-8');
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
      { name: CipherAlgorithmQuickCrypto.Cbc, length: 256 },
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
  exportKey = async (
    importFormat: 'raw' | 'jwk',
    key: unknown,
  ): Promise<string> => {
    const keyBuffer = (await Crypto.subtle.exportKey(
      importFormat,
      // @ts-expect-error - This should be as CryptoKey but the type is not exported
      key,
    )) as ArrayBuffer;
    const base64Key = Buffer.from(keyBuffer).toString('base64');
    return base64Key;
  };
}

export const QuickCryptoLib = new QuickCryptoEncryptionLibrary();
