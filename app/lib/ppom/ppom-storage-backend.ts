import { MMKV } from 'react-native-mmkv';
import { StorageBackend, StorageKey } from '@metamask/ppom-validator';

import { getArrayBufferForBlob } from 'react-native-blob-jsi-helper';

declare global {
  interface FileReader {
    _setReadyState(state: number): void;
    _result: Uint8Array | null;
    _error: string | null;
  }
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (window.FileReader?.prototype.readAsArrayBuffer) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.FileReader.prototype.readAsArrayBuffer = function (blob) {
    if (this.readyState === this.LOADING) throw new Error('InvalidStateError');
    this._setReadyState(this.LOADING);
    this._result = null;
    this._error = null;
    this._result = getArrayBufferForBlob(blob);
    this._setReadyState(this.DONE);
  };
}

class RNFSStorageBackend implements StorageBackend {
  private storage: MMKV;

  constructor(basePath: string) {
    this.storage = new MMKV({ id: basePath });
  }

  private _getDataFilePath(key: StorageKey): string {
    return `${key.name}-${key.chainId}`;
  }

  public async read(key: StorageKey, _checksum: string): Promise<ArrayBuffer> {
    let data: Uint8Array | undefined;
    try {
      data = this.storage.getBuffer(this._getDataFilePath(key));
    } catch (error) {
      throw new Error(`Error reading data: ${error}`);
    }

    if (!data) {
      throw new Error('No data found');
    }

    return data;
  }

  public async write(
    key: StorageKey,
    data: ArrayBuffer,
    _checksum: string,
  ): Promise<void> {
    const dataArray = new Uint8Array(data);
    this.storage.set(this._getDataFilePath(key), dataArray);
  }

  public async delete(key: StorageKey): Promise<void> {
    try {
      this.storage.delete(this._getDataFilePath(key));
    } catch (error) {
      throw new Error(`Error deleting data: ${error}`);
    }
  }

  public async dir(): Promise<StorageKey[]> {
    const allKeys = this.storage.getAllKeys();
    const storageKeys: StorageKey[] = [];
    for (const key of allKeys) {
      const [name, chainId] = key.split('-');
      storageKeys.push({ name, chainId });
    }
    return storageKeys;
  }
}

export default RNFSStorageBackend;
