import {
  removeApprovedHost,
  removeConnection,
} from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../Engine';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { revokeChannelPermissions } from '../utils/revokeChannelPermissions.util';

async function removeChannel({
  channelId,
  engine,
  sendTerminate,
  instance,
}: {
  channelId: string;
  engine?: typeof Engine;
  sendTerminate?: boolean;
  instance: SDKConnect;
}): Promise<boolean> {
  // check if it is an android sdk connection, if it doesn't belong to regular connections
  const isDappConnection = instance.state.connections[channelId] === undefined;

  DevLogger.log(
    `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} isDappConnection=${isDappConnection} connectedted=${
      instance.state.connected[channelId] !== undefined
    }`,
  );

  if (isDappConnection) {
    // Android SDK disabled for security reasons (pm-security #532, #534)
    instance.state.deeplinkingService?.removeConnection(channelId);
  }

  if (instance.state.connected[channelId]) {
    try {
      await instance.state.connected[channelId].removeConnection({
        terminate: true,
        context: 'SDKConnect::removeChannel',
      });
    } catch (err) {
      // A failed remote close does not keep the session. Local revoke below
      // still runs.
      console.error(`Can't remove connection ${channelId}`, err);
    }
  }

  if (engine) {
    try {
      revokeChannelPermissions(channelId);
    } catch (error) {
      DevLogger.log(
        `SDKConnect::removeChannel channelId=${channelId} failed to revoke permissions`,
        error,
      );
      return false;
    }
  }

  delete instance.state.connected[channelId];
  delete instance.state.connections[channelId];
  delete instance.state.approvedHosts[
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
  ];

  delete instance.state.disabledHosts[
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
  ];

  store.dispatch(removeConnection(channelId));
  store.dispatch(removeApprovedHost(channelId));

  delete instance.state.connecting[channelId];

  return true;
}

export default removeChannel;
