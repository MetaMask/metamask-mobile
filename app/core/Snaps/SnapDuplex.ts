///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { Duplex } from 'readable-stream';
import Logger from '../../util/Logger';

type StreamData = number | string | Record<string, unknown> | unknown[];

export interface PostMessageEvent {
  origin: string;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore This type is used inside the browser, so it's not available in react native
  source: typeof window;
}

/**
 * Abstract base class for postMessage streams.
 */
export default abstract class SnapDuplex extends Duplex {
  private _stream: any;
  private _jobId: string;

  constructor({ stream, jobId }: { stream: any; jobId: string }) {
    super({
      objectMode: true,
    });

    this._stream = stream;
    this._jobId = jobId;

    this._stream.on('data', (data: any) => this._onData(data));
  }

  protected _onData(data: StreamData): void {
    Logger.log(
      '[SNAP DUPLEX LOG] SnapDuplex+_onData: Job',
      this._jobId,
      'read data',
      data,
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (data.jobId !== this._jobId) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
    Logger.log('[SNAP DUPLEX LOG] SnapDuplex+_write: Job', this._jobId);
    this._stream.write({ data, jobId: this._jobId });
    cb();
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  destroy() {
    Logger.log(
      '[SNAP DUPLEX LOG] SnapDuplex+destroy: Destroy stream from SnapDuplex',
    );
    this._stream.destroy();
  }
}
///: END:ONLY_INCLUDE_IF
