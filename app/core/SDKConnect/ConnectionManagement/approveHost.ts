import AppConstants from '../../../core/AppConstants';
import SDKConnect, { approveHostProps } from '../SDKConnect';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import DefaultPreference from 'react-native-default-preference';

function approveHost({
  host,
  instance,
}: {
  host: approveHostProps['host'];
  instance: SDKConnect;
}) {
  const channelId = host.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '');
  if (instance.state.disabledHosts[host]) {
    // Might be useful for future feature.
  } else {
    const approvedUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;
    instance.state.approvedHosts[host] = approvedUntil;
    DevLogger.log(
      `SDKConnect approveHost ${host}`,
      instance.state.approvedHosts,
    );
    if (instance.state.connections[channelId]) {
      instance.state.connections[channelId].lastAuthorized = approvedUntil;
    }
    if (instance.state.connected[channelId]) {
      instance.state.connected[channelId].lastAuthorized = approvedUntil;
    }
    // Prevent disabled hosts from being persisted.
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(instance.state.approvedHosts),
    ).catch((err) => {
      throw err;
    });
  }
  instance.emit('refresh');
}

export default approveHost;
