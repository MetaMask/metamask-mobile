import WebView from '@metamask/react-native-webview';
import { JS_POST_MESSAGE_TO_PROVIDER } from '../../util/browserScripts';
import { Port } from './types';
// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
import { EventEmitter } from 'events';

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage for in-app browser
 */
class WebViewPort extends EventEmitter implements Port {
  _window: React.RefObject<WebView>['current'];

  constructor(webView: React.RefObject<WebView>) {
    super();
    this._window = webView.current;
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage = (msg: any, origin = '*') => {
    const js = JS_POST_MESSAGE_TO_PROVIDER(msg, origin);
    this._window?.injectJavaScript(js);
  };
}

export default WebViewPort;
