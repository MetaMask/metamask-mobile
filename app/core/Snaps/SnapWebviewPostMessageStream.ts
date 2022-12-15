// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { BasePostMessageStream } from '@metamask/post-message-stream';

interface WebViewPostMessageStreamArgs {
  name: string;
  stream: any;
  jobId: string;
}

/**
 * A {@link Window.postMessage} stream.
 */
export default class SnapWebviewPostMessageStream extends BasePostMessageStream {
  private _name: string;

  private _stream: string;
  private _jobId: string;
  /**
   * Creates a stream for communicating with other streams across the same or
   * different `window` objects.
   *
   * @param args - Options bag.
   * @param args.name - The name of the stream. Used to differentiate between
   * multiple streams sharing the same window object.
   * @param args.target - The name of the stream to exchange messages with.
   * @param args.targetOrigin - The origin of the target. Defaults to
   * `location.origin`, '*' is permitted.
   * @param args.targetWindow - The window object of the target stream. Defaults
   * to `window`.
   */
  constructor({ name, stream, jobId }: WebViewPostMessageStreamArgs) {
    super();

    this._name = name;
    this._stream = stream;
    this._jobId = jobId;
    this._onMessage = this._onMessage.bind(this);
    this._stream.on('data', (data) => this._onMessage(data));
  }

  protected _postMessage(data: unknown): void {
    // eslint-disable-next-line no-console
    console.log(
      '[SNAP STREAM LOG] SnapWebviewPostMessageStream+_postMessage: Write data',
    );
    this._stream.write(data);
  }

  private _onMessage(data: any): void {
    // eslint-disable-next-line no-console
    console.log(
      '[SNAP STREAM LOG] SnapWebviewPostMessageStream+_onMessage: Listen for data',
    );
    this._onData(data);
  }

  destroy(): void {
    // eslint-disable-next-line no-console
    console.log('TO DO: Destroy stream from SnapWebviewPostMessageStream');
    this.destroyed = true;
  }
}
