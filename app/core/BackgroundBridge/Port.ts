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
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] Port.postMessage: ${JSON.stringify(msg)}, origin: ${origin}, isMainFrame: ${this._isMainFrame}`);
      const js = this._isMainFrame
        ? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
        : JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
      
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] Port.postMessage injecting JavaScript into window`);
      this._window?.injectJavaScript(js);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[METAMASK-DEBUG] Error in Port.postMessage: ${error}`);
    }
  };
}

export default Port;
