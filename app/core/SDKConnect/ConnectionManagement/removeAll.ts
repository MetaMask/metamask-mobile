import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../AppConstants';
import SDKConnect from '../SDKConnect';

async function removeAll(instance: SDKConnect) {
  for (const id in instance.state.connections) {
    instance.removeChannel({
      channelId: id,
      sendTerminate: true,
      emitRefresh: false,
    });
  }

  for (const id in await instance.loadAndroidConnections()) {
    instance.removeChannel({
      channelId: id,
      sendTerminate: true,
      emitRefresh: false,
    });
  }

  // Remove all android connections
  await DefaultPreference.clear(AppConstants.MM_SDK.ANDROID_CONNECTIONS);

  // Also remove approved hosts that may have been skipped.
  instance.state.approvedHosts = {};
  instance.state.disabledHosts = {};
  instance.state.connections = {};
  instance.state.connected = {};
  instance.state.connecting = {};
  instance.state.paused = false;

  await DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
  await DefaultPreference.clear(AppConstants.MM_SDK.SDK_APPROVEDHOSTS);

  // Delayed ui refresh
  setTimeout(() => instance.emit('refresh'), 100);
}

export default removeAll;
