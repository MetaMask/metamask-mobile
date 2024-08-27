import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Dispatch } from 'redux';
import DevLogger from '../SDKConnect/utils/DevLogger';
import DeeplinkManager from './DeeplinkManager';

let instance: DeeplinkManager;

const SharedDeeplinkManager = {
  getInstance: () => instance,
  init: ({
    navigation,
    dispatch,
  }: {
    navigation: NavigationProp<ParamListBase>;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch: Dispatch<any>;
  }) => {
    if (instance) {
      return;
    }
    instance = new DeeplinkManager({
      navigation,
      dispatch,
    });
    DevLogger.log(`DeeplinkManager initialized`);
  },
  parse: (
    url: string,
    args: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) => instance.parse(url, args),
  setDeeplink: (url: string) => instance.setDeeplink(url),
  getPendingDeeplink: () => instance.getPendingDeeplink(),
  expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
