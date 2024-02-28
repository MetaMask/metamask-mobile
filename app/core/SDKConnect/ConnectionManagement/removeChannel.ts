import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import DefaultPreference from 'react-native-default-preference';
import Engine from '../../Engine';
import { PermissionController } from '@metamask/permission-controller';

function removeChannel({
  channelId,
  emitRefresh = true,
  engine,
  sendTerminate,
  instance,
}: {
  channelId: string;
  engine?: typeof Engine;
  sendTerminate?: boolean;
  emitRefresh?: boolean;
  instance: SDKConnect;
}) {
  // check if it is an android sdk connection, if it doesn't belong to regular connections
  const isAndroidConnection =
    instance.state.connections[channelId] === undefined;

  DevLogger.log(
    `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} isAndroidConnection=${isAndroidConnection} connectedted=${
      instance.state.connected[channelId] !== undefined
    }`,
  );

  if (isAndroidConnection) {
    instance.state.androidService?.removeConnection(channelId);
  }

  if (instance.state.connected[channelId]) {
    try {
      instance.state.connected[channelId].removeConnection({
        terminate: sendTerminate ?? false,
        context: 'SDKConnect::removeChannel',
      });
    } catch (err) {
      console.error(`Can't remove connection ${channelId}`, err);
    }

    delete instance.state.connected[channelId];
    delete instance.state.connections[channelId];
    delete instance.state.approvedHosts[
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
    ];

    delete instance.state.disabledHosts[
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
    ];

    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(instance.state.connections),
    ).catch((err) => {
      throw err;
    });

    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(instance.state.approvedHosts),
    ).catch((err) => {
      throw err;
    });
  }
  // Remove matching permissions from controller

  delete instance.state.connecting[channelId];
  if (engine) {
    const permissionsController = (
      engine.context as { PermissionController: PermissionController<any, any> }
    ).PermissionController;
    if (permissionsController.getPermissions(channelId)) {
      permissionsController.revokeAllPermissions(channelId);
    }
  }

  if (emitRefresh) {
    instance.emit('refresh');
  }
}

export default removeChannel;
