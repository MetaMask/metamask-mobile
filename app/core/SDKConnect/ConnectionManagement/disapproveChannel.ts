import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';

function disapproveChannel({
  channelId,
  instance,
}: {
  channelId: string;
  instance: SDKConnect;
}) {
  const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
  instance.state.connections[channelId].lastAuthorized = 0;
  delete instance.state.approvedHosts[hostname];
}

export default disapproveChannel;
