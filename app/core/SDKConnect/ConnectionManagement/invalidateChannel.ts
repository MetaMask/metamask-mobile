import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import DefaultPreference from 'react-native-default-preference';

function invalidateChannel({
  channelId,
  instance,
}: {
  channelId: string;
  instance: SDKConnect;
}) {
  const host = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;

  instance.state.disabledHosts[host] = 0;

  delete instance.state.approvedHosts[host];
  delete instance.state.connecting[channelId];
  delete instance.state.connections[channelId];

  DefaultPreference.set(
    AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
    JSON.stringify(instance.state.approvedHosts),
  ).catch((err) => {
    throw err;
  });

  DefaultPreference.set(
    AppConstants.MM_SDK.SDK_CONNECTIONS,
    JSON.stringify(instance.state.connections),
  ).catch((err) => {
    throw err;
  });
}

export default invalidateChannel;
