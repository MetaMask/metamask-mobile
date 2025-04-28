import Crypto from 'react-native-quick-crypto';
import { bytesToHex, remove0x } from '@metamask/utils';
import { EncryptionLibrary, KeyDerivationOptions } from './../types';


class QuickCryptoLib implements EncryptionLibrary {
  generateIV = async (size: number): Promise<string> =>
    // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
    // See: https://www.npmjs.com/package/react-native-aes-crypto#example
    remove0x(bytesToHex(await Crypto.getRandomValues(new Uint8Array(size))));

  deriveKey = async (
    password: string,
    salt: string,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    const passBuffer = Buffer.from(password, 'utf-8');
    const saltBuffer = Buffer.from(salt, 'utf-8');

    // We use the password buffer as a base "raw" key for pbkdf2.
    const baseKey = await Crypto.subtle.importKey(
      'raw',
      passBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );

    // Derive raw bits that will be used to generate the encryption key
    // to be used for encryption/decryption
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

    // Derive new key to be used with AES-CBC
    const key = await Crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // const keyBuffer = await Crypto.subtle.exportKey('raw', key);
    // return Buffer.from(keyBuffer).toString('base64');
    return this.exportKey('raw', key);
  };

  encrypt = async (data: string, key: string, iv: Buffer): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'utf-8');
    const cryptoKey = this.importKey(key);

    return await Crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      dataBuffer
    );
  };

  decrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'base64');
    const ivBuffer = Buffer.from(iv, 'hex');
    const cryptoKey = this.importKey(key);

    return await Crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBuffer },
      cryptoKey,
      dataBuffer,
    );
  };

  importKey = async (key: string): Promise<unknown> => {
    const keyBuffer = Buffer.from(key, 'base64');
    return await Crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
  };

  exportKey = async (importFormat: 'raw' | 'jwk', key: unknown): Promise<unknown> => {
    const keyBuffer = await Crypto.subtle.exportKey(importFormat, key);
    return Buffer.from(keyBuffer).toString('base64');
  };
}

export const quickCryptoLib = new QuickCryptoLib();
