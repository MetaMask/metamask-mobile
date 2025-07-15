import { QrScanRequest, SerializedUR } from '@metamask/eth-qr-keyring';
import { DeferredPromise, createDeferredPromise } from '@metamask/utils';
import { Mutex } from 'async-mutex';

export interface QrKeyringScannerOptions {
  onScanRequested?: (request: QrScanRequest) => void;
  onScanResolved?: (result: SerializedUR) => void;
  onScanRejected?: (error: Error) => void;
}

export class QrKeyringScanner {
  readonly #lock = new Mutex();

  readonly #onScanRequested?: (request: QrScanRequest) => void;

  readonly #onScanResolved?: (result: SerializedUR) => void;

  readonly #onScanRejected?: (error: Error) => void;

  #pendingScan?: DeferredPromise<SerializedUR> | null;

  constructor({
    onScanRequested,
    onScanResolved,
    onScanRejected,
  }: QrKeyringScannerOptions = {}) {
    this.#onScanRequested = onScanRequested;
    this.#onScanResolved = onScanResolved;
    this.#onScanRejected = onScanRejected;
  }

  requestScan(request: QrScanRequest): Promise<SerializedUR> {
    return this.#lock.runExclusive(() => {
      if (this.#pendingScan) {
        throw new Error('A scan is already pending.');
      }
      this.#pendingScan = createDeferredPromise<SerializedUR>();
      this.#onScanRequested?.(request);
      return this.#pendingScan.promise;
    });
  }

  resolvePendingScan(result: SerializedUR): void {
    if (!this.#pendingScan) {
      throw new Error('No pending scan to resolve.');
    }
    this.#pendingScan.resolve(result);
    this.#pendingScan = null;
    this.#onScanResolved?.(result);
  }

  rejectPendingScan(error: Error): void {
    if (!this.#pendingScan) {
      throw new Error('No pending scan to reject.');
    }
    this.#pendingScan.reject(error);
    this.#pendingScan = null;
    this.#onScanRejected?.(error);
  }
}
