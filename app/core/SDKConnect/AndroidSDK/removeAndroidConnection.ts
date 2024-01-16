import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import DefaultPreference from 'react-native-default-preference';

function removeAndroidConnection(id: string, instance: SDKConnect) {
  delete instance.state.connections[id];
  DefaultPreference.set(
    AppConstants.MM_SDK.ANDROID_CONNECTIONS,
    JSON.stringify(instance.state.connections),
  ).catch((err) => {
    throw err;
  });
  instance.emit('refresh');
}

export default removeAndroidConnection;
