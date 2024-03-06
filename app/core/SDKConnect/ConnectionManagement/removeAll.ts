import {
  resetAndroidConnections,
  resetApprovedHosts,
  resetConnections,
} from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import SDKConnect from '../SDKConnect';

async function removeAll(instance: SDKConnect) {
  for (const id in instance.state.connections) {
    instance.removeChannel({
      channelId: id,
      sendTerminate: true,
    });
  }

  for (const id in await instance.loadAndroidConnections()) {
    instance.removeChannel({
      channelId: id,
      sendTerminate: true,
    });
  }

  // Also remove approved hosts that may have been skipped.
  instance.state.approvedHosts = {};
  instance.state.disabledHosts = {};
  instance.state.connections = {};
  instance.state.connected = {};
  instance.state.connecting = {};
  instance.state.paused = false;

  store.dispatch(resetConnections({}));
  store.dispatch(resetApprovedHosts({}));
  store.dispatch(resetAndroidConnections({}));
}

export default removeAll;
