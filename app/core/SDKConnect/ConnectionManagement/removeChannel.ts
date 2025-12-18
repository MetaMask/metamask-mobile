import { PermissionController } from '@metamask/permission-controller';
import {
  removeApprovedHost,
  removeConnection,
} from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../Engine';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

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
      const terminated = await instance.state.connected[
        channelId
      ].removeConnection({
        terminate: true,
        context: 'SDKConnect::removeChannel',
      });
      if (!terminated) {
        DevLogger.log(
          `SDKConnect::removeChannel channelId=${channelId} terminated=${terminated} try again later`,
        );
        // don't delete channel, try again later
        return terminated;
      }
    } catch (err) {
      console.error(`Can't remove connection ${channelId}`, err);
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
  if (engine) {
    // Remove matching permissions from controller
    const permissionsController = (
      engine.context as {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;
    if (permissionsController.getPermissions(channelId)) {
      permissionsController.revokeAllPermissions(channelId);
    }
  }

  return true;
}

export default removeChannel;
