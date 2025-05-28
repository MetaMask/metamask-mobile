import Crypto from 'react-native-quick-crypto';
import { bytesToHex, remove0x } from '@metamask/utils';
import { EncryptionLibrary, KeyDerivationOptions } from './../types';
import { getRandomBytes } from '../bytes';
import { KDF_ALGORITHM, ENCRYPTION_LIBRARY } from '../constants';

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
  type: string = ENCRYPTION_LIBRARY.quickCrypto;

  generateIv = async (size: number): Promise<string> => {
    const randomValues = await getRandomBytes(size);
    const hexString = bytesToHex(randomValues);
    return remove0x(hexString);
  };

  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    const passBuffer = Buffer.from(password, 'utf-8');

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
      256
    );

    return Buffer.from(derivedBits).toString('base64');
  };

  encrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'utf-8');
    const ivBuffer = Buffer.from(iv, 'hex');
    const cryptoKey = await this.importKey(key);

    const encryptedData = await Crypto.subtle.encrypt(
      { name: CipherAlgorithmQuickCrypto.Cbc, iv: ivBuffer },
      // @ts-expect-error - This should be as CryptoKey but the type is not exported
      cryptoKey,
      dataBuffer
    );
    return Buffer.from(encryptedData).toString('base64');
  };

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

  exportKey = async (importFormat: 'raw' | 'jwk', key: unknown): Promise<string> => {
    // @ts-expect-error - This should be as CryptoKey but the type is not exported
    const keyBuffer = await Crypto.subtle.exportKey(importFormat, key) as ArrayBuffer;
    const base64Key = Buffer.from(keyBuffer).toString('base64');
    return base64Key;
  };
}

export const QuickCryptoLib = new QuickCryptoEncryptionLibrary();
