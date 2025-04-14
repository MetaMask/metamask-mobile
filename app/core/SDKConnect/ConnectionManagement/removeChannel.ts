import { PermissionController } from '@metamask/permission-controller';
import {
  removeApprovedHost,
  removeConnection,
  resetConnections,
} from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../Engine';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

const MAX_FAILED_TERMINATE = 3;
const TERMINATION_TIMEOUT = 4000;

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
    `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} isDappConnection=${isDappConnection} connectedted=${instance.state.connected[channelId] !== undefined
    }`,
  );

  if (isDappConnection) {
    instance.state.androidService?.removeConnection(channelId);
    instance.state.deeplinkingService?.removeConnection(channelId);
  }

  const connected = instance.state.connected[channelId];
  const connectionProps = instance.state.connections[channelId];

  // Mark for deletion immediately if not already marked
  if (!connectionProps.markedForDeletion) {
    connectionProps.markedForDeletion = true;
    connected.markedForDeletion = true;
    // Update the connection in redux
    store.dispatch(resetConnections(instance.state.connections));
  }

  DevLogger.log(`SDKConnect::removeChannel channelId=${channelId} connected=${connected !== undefined}`);
  if (connected) {
    try {
      const terminatePromise = connected.removeConnection({
        terminate: true,
        context: 'SDKConnect::removeChannel',
      });

      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          DevLogger.log(`SDKConnect::removeChannel channelId=${channelId} termination timed out after 2s`);
          resolve(false);
        }, TERMINATION_TIMEOUT);
      });

      const terminated = await Promise.race([terminatePromise, timeoutPromise]);

      if (!terminated) {
        // Update termination attempt counters
        connected.failedTerminationAttempts += 1;
        connected.lastTerminationAttempt = Date.now();
        connectionProps.failedTerminationAttempts = connected.failedTerminationAttempts;
        connectionProps.lastTerminationAttempt = connected.lastTerminationAttempt;

        DevLogger.log(
          `SDKConnect::removeChannel channelId=${channelId} terminated=${terminated} attempts=${connected.failedTerminationAttempts}`,
        );

        // If we haven't exceeded max retries, don't proceed with deletion
        if (connected.failedTerminationAttempts < MAX_FAILED_TERMINATE) {
          store.dispatch(resetConnections(instance.state.connections));
          return false;
        }

        DevLogger.log(`SDKConnect::removeChannel channelId=${channelId} max retries exceeded, forcing removal`);
      }
    } catch (err) {
      console.error(`Can't remove connection ${channelId}`, err);
    }
  }

  // Proceed with actual removal
  delete instance.state.connected[channelId];
  delete instance.state.connections[channelId];
  delete instance.state.approvedHosts[AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId];
  delete instance.state.disabledHosts[AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId];
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
