import RNFS from 'react-native-fs';
import { StorageBackend, StorageKey } from '@metamask/ppom-validator';
import { arrayBufferToBase64, base64toArrayBuffer } from './array-buffer';

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

  public async read(key: StorageKey): Promise<ArrayBuffer> {
    try {
      await this.ensureBaseDirectoryExists();
      const filePath = await this._getDataFilePath(key);
      const base64 = await RNFS.readFile(filePath, 'base64');
      return base64toArrayBuffer(base64);
    } catch (error) {
      throw new Error(`Error reading data: ${error}`);
    }
  }

  public async write(key: StorageKey, data: ArrayBuffer): Promise<void> {
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
