import { NavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import AndroidService from '../AndroidSDK/AndroidService';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import asyncInit from './asyncInit';

async function init({
  navigation,
  context,
  instance,
}: {
  navigation: NavigationContainerRef;
  context?: string;
  instance: SDKConnect;
}) {
  if (instance.state._initializing) {
    DevLogger.log(
      `SDKConnect::init()[${context}] -- already initializing -- wait for completion`,
    );
    return await instance.state._initializing;
  } else if (instance.state._initialized) {
    DevLogger.log(
      `SDKConnect::init()[${context}] -- SKIP -- already initialized`,
      instance.state.connections,
    );
    return;
  }

  if (!instance.state.androidSDKStarted && Platform.OS === 'android') {
    DevLogger.log(`SDKConnect::init() - starting android service`);
    instance.state.androidService = new AndroidService();
    instance.state.androidSDKStarted = true;
  }

  instance.state._initializing = asyncInit({
    navigation,
    instance,
    context,
  });

  return instance.state._initializing;
}

export default init;
