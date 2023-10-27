import { StackNavigationProp } from '@react-navigation/stack';
import DeeplinkManager from './DeeplinkManager';
import { Dispatch } from 'redux';

let deeplinkManagerInstance: DeeplinkManager;

const SharedDeeplinkManager = {
  init: ({
    navigation,
    dispatch,
  }: {
    navigation: StackNavigationProp<{
      [route: string]: { screen: string };
    }>;
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
