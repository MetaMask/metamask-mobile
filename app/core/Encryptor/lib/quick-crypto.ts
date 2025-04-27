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
    exportable: boolean,
    opts: KeyDerivationOptions,
  ): Promise<string> => {
    const passBuffer = Buffer.from(password, 'utf-8');
    const saltBuffer = Buffer.from(salt, 'utf-8');

    // We use the password buffer as a "raw" key.
    // Later this will be used as the base for pbkdf2.
    const baseKey = await Crypto.subtle.importKey(
      'raw',
      passBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );

    //Derive raw bits that will be used to generate the encryption key
    // to be used for encryption/decryption
    const { iterations } = opts.params;
    const derivedBits = await Crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-512' },
      baseKey,
      256
    );

    // Derive new key to be used with AES-CBC
    return await Crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-CBC', length: 256 },
      exportable,
      ['encrypt', 'decrypt']
    );

  };

  exportKey = async (key: string): Promise<unknown> => await Crypto.subtle.exportKey('jwk', key);

  encrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'utf-8');
    // const ivBuffer = Buffer.from(iv, 'utf-8');
    return await Crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      dataBuffer
    );
  };

  decrypt = async (data: string, key: string, iv: string): Promise<string> => {
    const dataBuffer = Buffer.from(data, 'utf-8');
    const ivBuffer = Buffer.from(iv, 'utf-8');
    return await Crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBuffer },
      key,
      dataBuffer,
    );
  };
}

export const quickCryptoLib = new QuickCryptoLib();
