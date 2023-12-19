import Logger from '../../../util/Logger';
import { NativeModules, Platform } from 'react-native';
import SDKConnect from '../SDKConnect';

async function bindAndroidSDK(instance: SDKConnect) {
  if (Platform.OS !== 'android') {
    return;
  }

  if (instance.state.androidSDKBound) return;

  try {
    // Always bind native module to client as early as possible otherwise connection may have an invalid status
    await NativeModules.CommunicationClient.bindService();
    instance.state.androidSDKBound = true;
  } catch (err) {
    Logger.log(err, `SDKConnect::bindAndroiSDK failed`);
  }
}

export default bindAndroidSDK;
