import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

function disapproveChannel({
  channelId,
  instance,
}: {
  channelId: string;
  instance: SDKConnect;
}) {
  const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
  DevLogger.log(
    `SDKConnect::disapproveChannel - ${hostname} - channelId=${channelId}`,
    instance.state.connections,
  );
  if (instance.state.connections[channelId]) {
    instance.state.connections[channelId].lastAuthorized = 0;
  }

  delete instance.state.approvedHosts[hostname];
}

export default disapproveChannel;
