import Crypto from 'react-native-quick-crypto';
import { hasProperty, isPlainObject, Json, bytesToHex, remove0x } from '@metamask/utils';
import {
  SALT_BYTES_COUNT,
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
} from './constants';
import type {
  WithKeyEncryptor,
  EncryptionKey,
  EncryptionResult,
  KeyDerivationOptions,
} from './types';
import { QuickCryptoLib } from './lib';

interface DetailedDecryptResult {
  exportedKeyString: string;
  vault: unknown;
  salt: string;
}

interface DetailedEncryptionResult {
  vault: string;
  exportedKeyString: string;
}

const isKeyDerivationOptions = (
  derivationOptions: unknown,
): derivationOptions is KeyDerivationOptions =>
  isPlainObject(derivationOptions) &&
  hasProperty(derivationOptions, 'algorithm') &&
  hasProperty(derivationOptions, 'params');

const isEncryptionKey = (key: unknown): key is EncryptionKey =>
  isPlainObject(key) &&
  hasProperty(key, 'key') &&
  hasProperty(key, 'lib') &&
  hasProperty(key, 'keyMetadata') &&
  isKeyDerivationOptions(key.keyMetadata);

class Encryptor implements WithKeyEncryptor<EncryptionKey, Json> {
  private keyDerivationOptions: KeyDerivationOptions;

  constructor({
    keyDerivationOptions,
  }: {
    keyDerivationOptions: KeyDerivationOptions;
  }) {
    this.keyDerivationOptions = keyDerivationOptions;
  }

  generateSalt = (size: number = SALT_BYTES_COUNT) => {
    const start = performance.now();
    const view = new Uint8Array(size);
    Crypto.getRandomValues(view);
    const result = btoa(String.fromCharCode.apply(null, view as unknown as number[]));
    const end = performance.now();
    console.log(`@performance-log generateSalt took ${end - start} ms`);
    return result;
  };

  keyFromPassword = async (
    password: string,
    salt: string,
    exportable = true,
    opts: KeyDerivationOptions = this.keyDerivationOptions,
    lib = ENCRYPTION_LIBRARY.original,
  ): Promise<EncryptionKey> => {
    const start = performance.now();
    const derivedKey = await QuickCryptoLib.deriveKey(password, salt, opts);
    const result = {
      key: derivedKey,
      keyMetadata: opts,
      exportable,
      lib,
    };
    const end = performance.now();
    console.log(`@performance-log keyFromPassword took ${end - start} ms`);
    return result;
  };

  encryptWithKey = async (
    key: EncryptionKey,
    data: Json,
  ): Promise<EncryptionResult> => {
    const start = performance.now();
    const text = JSON.stringify(data);
    const iv = Crypto.getRandomValues(new Uint8Array(16)) as Uint8Array;
    const result = await QuickCryptoLib.encrypt(text, key.key, iv);
    const cipher = Buffer.from(result).toString('base64');
    const encryptionResult = {
      cipher,
      iv: remove0x(bytesToHex(iv)),
      keyMetadata: key.keyMetadata,
      lib: key.lib,
    };
    const end = performance.now();
    console.log(`@performance-log encryptWithKey took ${end - start} ms`);
    return encryptionResult;
  };

  decryptWithKey = async (
    key: EncryptionKey,
    payload: EncryptionResult,
  ): Promise<unknown> => {
    const start = performance.now();
    const result = await QuickCryptoLib.decrypt(payload.cipher, key.key, payload.iv);
    const text = Buffer.from(result).toString('utf-8');
    const decryptedData = JSON.parse(text);
    const end = performance.now();
    console.log(`@performance-log decryptWithKey took ${end - start} ms`);
    return decryptedData;
  };

  encrypt = async (password: string, data: Json): Promise<string> => {
    const start = performance.now();
    const salt = this.generateSalt(16);
    const key = await this.keyFromPassword(
      password,
      salt,
      false,
      this.keyDerivationOptions,
      ENCRYPTION_LIBRARY.original,
    );
    const result = await this.encryptWithKey(key, data);
    result.lib = key.lib;
    result.salt = salt;
    result.keyMetadata = key.keyMetadata;
    const encryptedString = JSON.stringify(result);
    const end = performance.now();
    console.log(`@performance-log encrypt took ${end - start} ms`);
    return encryptedString;
  };

  decrypt = async (password: string, text: string): Promise<unknown> => {
    const start = performance.now();
    const payload = JSON.parse(text);
    const key = await this.keyFromPassword(
      password,
      payload.salt,
      false,
      payload.keyMetadata ?? LEGACY_DERIVATION_OPTIONS,
      payload.lib,
    );
    const decryptedData = await this.decryptWithKey(key, payload);
    const end = performance.now();
    console.log(`@performance-log decrypt took ${end - start} ms`);
    return decryptedData;
  };

  isVaultUpdated = (
    vault: string,
    targetDerivationParams = this.keyDerivationOptions,
  ): boolean => {
    const start = performance.now();
    const { keyMetadata } = JSON.parse(vault);
    const isUpdated = (
      isKeyDerivationOptions(keyMetadata) &&
      keyMetadata.algorithm === targetDerivationParams.algorithm &&
      keyMetadata.params.iterations === targetDerivationParams.params.iterations
    );
    const end = performance.now();
    console.log(`@performance-log isVaultUpdated took ${end - start} ms`);
    return isUpdated;
  };

  exportKey = async (key: EncryptionKey): Promise<string> => {
    const start = performance.now();
    if (!key.exportable) {
      throw new Error('Key is not exportable');
    }
    const json = JSON.stringify(key);
    const base64Key = Buffer.from(json).toString('base64');
    const end = performance.now();
    console.log(`@performance-log exportKey took ${end - start} ms`);
    return base64Key;
  };

  importKey = async (keyString: string): Promise<EncryptionKey> => {
    const start = performance.now();
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
    const end = performance.now();
    console.log(`@performance-log importKey took ${end - start} ms`);
    return key as EncryptionKey;
  };

  decryptWithDetail = async (
    password: string,
    text: string,
  ): Promise<DetailedDecryptResult> => {
    const start = performance.now();
    const payload = JSON.parse(text);
    const { salt, keyMetadata } = payload;
    const key = await this.keyFromPassword(password, salt, true, keyMetadata ?? LEGACY_DERIVATION_OPTIONS, payload.lib);
    const exportedKeyString = await this.exportKey(key);
    const vault = await this.decryptWithKey(key, payload);
    const result = {
      exportedKeyString,
      vault,
      salt,
    };
    const end = performance.now();
    console.log(`@performance-log decryptWithDetail took ${end - start} ms`);
    return result;
  };

  encryptWithDetail = async (
    password: string,
    dataObj: Json,
    salt = this.generateSalt(),
    keyDerivationOptions = this.keyDerivationOptions,
  ): Promise<DetailedEncryptionResult> => {
    const start = performance.now();
    const key = await this.keyFromPassword(password, salt, true, keyDerivationOptions, ENCRYPTION_LIBRARY.original);
    const exportedKeyString = await this.exportKey(key);
    const result = await this.encryptWithKey(key, dataObj);
    result.salt = salt;
    result.keyMetadata = key.keyMetadata;
    const vault = JSON.stringify(result);
    const encryptionDetail = {
      vault,
      exportedKeyString,
    };
    const end = performance.now();
    console.log(`@performance-log encryptWithDetail took ${end - start} ms`);
    return encryptionDetail;
  };
}

export { Encryptor };
