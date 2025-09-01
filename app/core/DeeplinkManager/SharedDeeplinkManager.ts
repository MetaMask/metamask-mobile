import DevLogger from '../SDKConnect/utils/DevLogger';
import DeeplinkManager from './DeeplinkManager';

let instance: DeeplinkManager;

const SharedDeeplinkManager = {
  getInstance: () => instance,
  init: () => {
    if (instance) {
      return;
    }
    instance ??= new DeeplinkManager();
    DevLogger.log(`DeeplinkManager initialized`);
  },
  parse: (
    url: string,
    args: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) => {
    // Always try initialize, but instance will only be assigned once
    SharedDeeplinkManager.init();
    return instance.parse(url, args);
  },
  setDeeplink: (url: string) => instance.setDeeplink(url),
  getPendingDeeplink: () => instance.getPendingDeeplink(),
  expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
