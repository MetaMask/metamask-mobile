import {
  JS_POST_MESSAGE_TO_PROVIDER,
  JS_IFRAME_POST_MESSAGE_TO_PROVIDER,
} from '../../util/browserScripts';
// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const EventEmitter = require('events').EventEmitter;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage for in-app browser
 */
class Port extends EventEmitter {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _window: any;
  private _isMainFrame: boolean;

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(browserWindow: any, isMainFrame: boolean) {
    super();
    this._window = browserWindow;
    this._isMainFrame = isMainFrame;
    // eslint-disable-next-line no-console
    console.log(`[METAMASK-DEBUG] Port created - isMainFrame: ${isMainFrame}`);
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage = (msg: any, origin = '*') => {
    try {
      // Add additional detail for response messages to help debugging
      if (msg && typeof msg === 'object' && msg.data && (msg.data.result !== undefined || msg.data.error !== undefined)) {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] Port.postMessage RESPONSE: ${JSON.stringify({
          id: msg.data.id,
          name: msg.name,
          hasResult: msg.data.result !== undefined,
          hasError: msg.data.error !== undefined
        })}, origin: ${origin}, isMainFrame: ${this._isMainFrame}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] Port.postMessage: ${JSON.stringify(msg)}, origin: ${origin}, isMainFrame: ${this._isMainFrame}`);
      }

      // For JSON-RPC responses (to eth_requestAccounts etc.), ensure they have the correct format
      if (msg && typeof msg === 'object' && msg.name === 'metamask-provider' && 
          msg.data && typeof msg.data === 'object' && msg.data.id !== undefined) {
        
        // Make sure result or error is present - this should be guaranteed by the caller
        if (msg.data.result === undefined && msg.data.error === undefined) {
          // eslint-disable-next-line no-console
          console.log(`[METAMASK-DEBUG] Port.postMessage WARNING: Response missing result or error fields: ${JSON.stringify(msg.data)}`);
        }
        
        // Remove any extra flags that might confuse the receiver
        if (msg.data.toNative !== undefined) {
          delete msg.data.toNative;
          // eslint-disable-next-line no-console
          console.log(`[METAMASK-DEBUG] Port.postMessage removed toNative flag from response`);
        }
      }

      const js = this._isMainFrame
        ? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
        : JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
      
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] Port.postMessage injecting JavaScript into window`);
      
      if (!this._window) {
        // eslint-disable-next-line no-console
        console.error(`[METAMASK-DEBUG] Port.postMessage ERROR: this._window is undefined`);
        return;
      }
      
      this._window.injectJavaScript(js);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[METAMASK-DEBUG] Error in Port.postMessage: ${error}`);
    }
  };

  // Check how messages from the WebView are handled here
  // This is what receives the messages from window.ReactNativeWebView.postMessage() calls
}

export default Port;
