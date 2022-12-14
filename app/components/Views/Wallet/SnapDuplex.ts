import { Duplex } from 'readable-stream';

type StreamData = number | string | Record<string, unknown> | unknown[];

export interface PostMessageEvent {
  origin: string;
  source: typeof window;
}

/**
 * Abstract base class for postMessage streams.
 */
export abstract class SnapDuplex extends Duplex {
  private _stream: any;
  private _jobId: string;

  constructor({ stream, jobId }: { stream: any; jobId: string }) {
    super({
      objectMode: true,
    });

    this._stream = stream;
    this._jobId = jobId;

    this._stream.on('data', (data) => this._onData(data));
  }

  protected _onData(data: StreamData): void {
    console.log('MESSAGE FROM', this._jobId, data);
    if (data.jobId !== this._jobId) {
      return;
    }

    this.push(data.data);
  }

  /**
   * Child classes must implement this function.
   */
  protected abstract _postMessage(_data?: unknown): void;

  _read(): void {
    return undefined;
  }

  _write(data: StreamData, _encoding: string | null, cb: () => void): void {
    console.log('MESSAGE TO', this._jobId, Object.keys(data.data));
    this._stream.write({ data, jobId: this._jobId });
    cb();
  }

  destroy() {
    console.log('Destroy SnapDuplex');
    this._stream.destroy();
    console.log(!!this._stream);
  }
}
