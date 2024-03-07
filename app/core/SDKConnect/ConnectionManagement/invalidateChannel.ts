import {
  resetApprovedHosts,
  resetConnections,
} from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';

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

  store.dispatch(resetApprovedHosts(instance.state.approvedHosts));
  store.dispatch(resetConnections(instance.state.connections));
}

export default invalidateChannel;
