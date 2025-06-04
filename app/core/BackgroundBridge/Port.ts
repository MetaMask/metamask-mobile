import { store } from '../../store';
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
  constructor(browserWindow: any, isMainFrame: boolean) {
    super();
    this._window = browserWindow;
    this._isMainFrame = isMainFrame;
  }

  postMessage = (msg: object, origin = '*') => {
    const { activeTab, tabs } = store.getState().browser;
    const currentActiveTab = tabs.find((tab: any) => tab.id === activeTab);
    const currentActiveParsedUrl = new URL(currentActiveTab.url);
    const currentActiveOrigin = currentActiveParsedUrl.origin;
    if (currentActiveOrigin !== origin) return;
    const js = this._isMainFrame
      ? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
      : JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
    this._window?.injectJavaScript(js);
  };
}

export default Port;
