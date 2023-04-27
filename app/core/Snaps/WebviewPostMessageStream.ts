// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  BasePostMessageStream,
  PostMessageEvent,
} from '@metamask/post-message-stream';

interface WebViewPostMessageStreamArgs {
  name: string;
  target: string;
  targetOrigin?: string;
  targetWindow?: Window;
}

/**
 * A {@link Window.postMessage} stream.
 */
export default class WebviewPostMessageStream extends BasePostMessageStream {
  private _name: string;

  private _target: string;

  private _targetOrigin: string;

  private _targetWindow: Window;

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
  constructor({
    name,
    target,
    targetOrigin,
    targetWindow,
  }: WebViewPostMessageStreamArgs) {
    super();

    this._name = name;
    this._target = target;
    this._targetOrigin = targetOrigin;
    this._targetWindow = targetWindow;
    this._onMessage = this._onMessage.bind(this);

    //this._targetWindow.onMessage = this._onMessage;

    setTimeout(() => this._handshake(), 0);
  }

  protected _postMessage(data: unknown): void {
    const message = {
      target: this._target,
      data,
    };
    this._targetWindow.injectJavaScript(
      `window.postMessage(${JSON.stringify(message)})`,
    );
  }

  private _onMessage(event: PostMessageEvent): void {
    const message = event.nativeEvent;
    const data = JSON.parse(message.data);

    this._onData(data.data);
  }

  destroy(): void {
    // Do nothing
    // eslint-disable-next-line no-console
    console.log('[WebviewPostMessageStream LOG]: Destroy stream');
  }
}
