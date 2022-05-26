import {
  BasePostMessageStream,
  PostMessageEvent,
} from '@metamask/post-message-stream/dist/BasePostMessageStream';
import WebView from 'react-native-webview';

interface MobilePostMessageStreamArgs {
  name: string;
  target: string;
  targetWindow?: Window;
  targetOrigin?: string;
}

/**
 * Window.postMessage stream.
 */
export default class SnapMobilePostMessageStream extends BasePostMessageStream {
  private _name: string;

  private _target: string;

  public webView?: WebView;

  /**
   * Creates a stream for communicating with other streams across the same or
   * different window objects.
   *
   * @param args.name - The name of the stream. Used to differentiate between
   * multiple streams sharing the same window object.
   * @param args.target - The name of the stream to exchange messages with.
   * @param args.targetWindow - The window object of the target stream. Defaults
   * to `window`.
   * @param args.targetOrigin - The target origin for the iframe. Defaults to location.origin, allows '*' to be passed.
   */
  constructor({ name, target }: MobilePostMessageStreamArgs) {
    if (!name || !target) {
      throw new Error('Invalid input.');
    }
    super();

    this._name = name;
    this._target = target;
    this._onMessage = this._onMessage.bind(this);

    this._handshake();
  }

  public setWebView(webview: WebView) {
    this.webView = webview;
  }

  public _postMessage(data: unknown): void {
    this.webView?.injectJavaScript(
      `window.mobileSnapExecutor.rootStream.write({
        target: ${this._target},
        data: ${JSON.stringify(data)}
      })`,
    );
  }

  public _onMessage(event: PostMessageEvent): void {
    const message = event.data;
    if (message) {
      this._onData((message as any).data);
    }
  }

  _destroy(): void {
    //
  }
}
