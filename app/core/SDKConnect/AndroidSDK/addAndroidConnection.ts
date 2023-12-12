import { ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../../core/AppConstants';

async function addAndroidConnection(
  connection: ConnectionProps,
  instance: SDKConnect,
) {
  instance.state.connections[connection.id] = connection;

  DevLogger.log(`SDKConnect::addAndroidConnection`, connection);

  await DefaultPreference.set(
    AppConstants.MM_SDK.ANDROID_CONNECTIONS,
    JSON.stringify(instance.state.connections),
  ).catch((err) => {
    throw err;
  });

  instance.emit('refresh');
}

export default addAndroidConnection;
