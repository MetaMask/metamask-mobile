import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Dispatch } from 'redux';
import DeeplinkManager from './DeeplinkManager';

let deeplinkManagerInstance: DeeplinkManager;

const SharedDeeplinkManager = {
  getInstance: () => deeplinkManagerInstance,
  init: ({
    navigation,
    dispatch,
  }: {
    navigation: NavigationProp<ParamListBase>;
    dispatch: Dispatch<any>;
  }) => {
    if (deeplinkManagerInstance) {
      return;
    }

    deeplinkManagerInstance = new DeeplinkManager({
      navigation,
      dispatch,
    });
  },
  parse: (url: string, args: any) => deeplinkManagerInstance.parse(url, args),
  setDeeplink: (url: string) => deeplinkManagerInstance.setDeeplink(url),
  getPendingDeeplink: () => deeplinkManagerInstance.getPendingDeeplink(),
  expireDeeplink: () => deeplinkManagerInstance.expireDeeplink(),
};

export default SharedDeeplinkManager;
