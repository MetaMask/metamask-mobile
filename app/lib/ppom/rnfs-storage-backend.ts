import RNFS from 'react-native-fs';
import { SHA256 } from 'crypto-js';
import { StorageBackend, StorageKey } from '@metamask/ppom-validator';

import { arrayBufferToBase64, base64toArrayBuffer } from './array-buffer';

/*
 * Validate the checksum of the file
 * The checksum is calculated from the file content using SHA-256
 */
const validateChecksum = (
  key: StorageKey,
  data: ArrayBuffer,
  checksum: string,
) => {
  const hash = SHA256(CryptoJS.lib.WordArray.create(data as any));
  const hashString = hash.toString();

  if (hashString !== checksum) {
    throw new Error(`Checksum mismatch for key ${key}`);
  }
};

class RNFSStorageBackend implements StorageBackend {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = `${RNFS.DocumentDirectoryPath}/${basePath}`;
  }

  private async ensureBaseDirectoryExists(): Promise<void> {
    const exists = await RNFS.exists(this.basePath);
    if (!exists) {
      await RNFS.mkdir(this.basePath, { NSURLIsExcludedFromBackupKey: true });
    }
  }

  private async _getDataFilePath(key: StorageKey): Promise<string> {
    return `${this.basePath}/${key.name}_${key.chainId}`;
  }

  public async read(key: StorageKey, checksum: string): Promise<ArrayBuffer> {
    let data: ArrayBuffer | undefined;
    try {
      await this.ensureBaseDirectoryExists();
      const filePath = await this._getDataFilePath(key);
      const base64 = await RNFS.readFile(filePath, 'base64');
      data = base64toArrayBuffer(base64);
    } catch (error) {
      throw new Error(`Error reading data: ${error}`);
    }
    validateChecksum(key, data, checksum);
    return data;
  }

  public async write(
    key: StorageKey,
    data: ArrayBuffer,
    checksum: string,
  ): Promise<void> {
    validateChecksum(key, data, checksum);
    try {
      await this.ensureBaseDirectoryExists();
      const filePath = await this._getDataFilePath(key);
      const base64 = arrayBufferToBase64(data);
      await RNFS.writeFile(filePath, base64, 'base64');
    } catch (error) {
      throw new Error(`Error writing data: ${error}`);
    }
  }

  public async delete(key: StorageKey): Promise<void> {
    try {
      await this.ensureBaseDirectoryExists();
      const filePath = await this._getDataFilePath(key);
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
    } catch (error) {
      throw new Error(`Error deleting data: ${error}`);
    }
  }

  public async dir(): Promise<StorageKey[]> {
    try {
      await this.ensureBaseDirectoryExists();
      const files = await RNFS.readdir(this.basePath);
      const storageKeys: StorageKey[] = [];

      for (const file of files) {
        const [name, chainId] = file.split('_');
        storageKeys.push({ name, chainId });
      }

      return storageKeys;
    } catch (error) {
      throw new Error(`Error retrieving directory: ${error}`);
    }
  }
}

export default RNFSStorageBackend;
