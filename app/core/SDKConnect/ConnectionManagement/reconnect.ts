import { Connection, ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { waitForCondition } from '../utils/wait.util';

async function reconnect({
  channelId,
  otherPublicKey,
  initialConnection,
  trigger,
  updateKey,
  context,
  instance,
}: {
  channelId: string;
  otherPublicKey: string;
  context?: string;
  updateKey?: boolean;
  trigger?: ConnectionProps['trigger'];
  initialConnection: boolean;
  instance: SDKConnect;
}) {
  const existingConnection: Connection | undefined =
    instance.state.connected[channelId];

  // Check if already connected
  if (existingConnection?.remote.isReady()) {
    DevLogger.log(`SDKConnect::reconnect[${context}] - already ready - ignore`);
    if (trigger) {
      instance.state.connected[channelId].setTrigger('deeplink');
    }
    instance.updateSDKLoadingState({ channelId, loading: false });

    return;
  }

  if (instance.state.paused && updateKey) {
    instance.state.connections[channelId].otherPublicKey = otherPublicKey;
    const currentOtherPublicKey =
      instance.state.connections[channelId].otherPublicKey;
    if (currentOtherPublicKey !== otherPublicKey) {
      console.warn(
        `SDKConnect::reconnect[${context}] existing=${
          existingConnection !== undefined
        } - update otherPublicKey -  ${currentOtherPublicKey} --> ${otherPublicKey}`,
      );
      if (existingConnection) {
        existingConnection.remote.setOtherPublicKey(otherPublicKey);
      }
    } else {
      DevLogger.log(`SDKConnect::reconnect[${context}] - same otherPublicKey`);
    }
  }

  // Update initial connection state
  instance.state.connections[channelId].initialConnection = initialConnection;

  const wasPaused = existingConnection?.remote.isPaused();
  // Make sure the connection has resumed from pause before reconnecting.
  await waitForCondition({
    fn: () => !instance.state.paused,
    context: 'reconnect_from_pause',
  });
  if (wasPaused) {
    DevLogger.log(`SDKConnect::reconnect[${context}] - not paused anymore`);
  }
  const connecting = instance.state.connecting[channelId] === true;
  const socketConnected = existingConnection?.remote.isConnected() ?? false;

  DevLogger.log(
    `SDKConnect::reconnect[${context}][${trigger}] - channel=${channelId} paused=${
      instance.state.paused
    } connecting=${connecting} socketConnected=${socketConnected} existingConnection=${
      existingConnection !== undefined
    }`,
    otherPublicKey,
  );

  let interruptReason = '';

  if (connecting && trigger !== 'deeplink') {
    // Prioritize deeplinks -- interrup other connection attempts.
    interruptReason = 'already connecting';
  } else if (connecting && trigger === 'deeplink') {
    // Keep comment for future reference in case android issue re-surface
    // special case on android where the socket was not updated
    // if (Platform.OS === 'android') {
    //   interruptReason = 'already connecting';
    // } else {
    //   console.warn(`Priotity to deeplink - overwrite previous connection`);
    //   instance.removeChannel(channelId, true);
    // }

    // instance condition should not happen keeping it for debug purpose.
    console.warn(`Priotity to deeplink - overwrite previous connection`);
    instance.removeChannel({ channelId, sendTerminate: true });
  }

  if (!instance.state.connections[channelId]) {
    interruptReason = 'no connection';
  }

  if (interruptReason) {
    DevLogger.log(
      `SDKConnect::reconnect - interrupting reason=${interruptReason}`,
    );
    return;
  }

  if (existingConnection) {
    const connected = existingConnection?.remote.isConnected();
    const ready = existingConnection?.isReady;
    if (connected) {
      if (trigger) {
        instance.state.connected[channelId].setTrigger(trigger);
      }
      DevLogger.log(
        `SDKConnect::reconnect - already connected [connected] -- trigger updated to '${trigger}'`,
      );
      instance.updateSDKLoadingState({ channelId, loading: false });
      return;
    }

    if (ready) {
      DevLogger.log(
        `SDKConnect::reconnect - already connected [ready=${ready}] -- ignoring`,
      );
      instance.updateSDKLoadingState({ channelId, loading: false });
      return;
    }
  }

  DevLogger.log(`SDKConnect::reconnect - starting reconnection`);

  const connection = instance.state.connections[channelId];
  instance.state.connecting[channelId] = true;
  instance.state.connected[channelId] = new Connection({
    ...connection,
    socketServerUrl: instance.state.socketServerUrl,
    otherPublicKey,
    reconnect: true,
    trigger,
    initialConnection,
    rpcQueueManager: instance.state.rpcqueueManager,
    navigation: instance.state.navigation,
    approveHost: instance._approveHost.bind(instance),
    disapprove: instance.disapproveChannel.bind(instance),
    getApprovedHosts: instance.getApprovedHosts.bind(instance),
    revalidate: instance.revalidateChannel.bind(instance),
    isApproved: instance.isApproved.bind(instance),
    updateOriginatorInfos: instance.updateOriginatorInfos.bind(instance),
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onTerminate: ({ channelId }) => {
      instance.removeChannel({ channelId });
    },
  });
  instance.state.connected[channelId].connect({
    withKeyExchange: true,
  });

  instance.watchConnection(instance.state.connected[channelId]);
  const afterConnected =
    instance.state.connected[channelId].remote.isConnected() ?? false;
  instance.state.connecting[channelId] = !afterConnected; // If not connected, it means it's connecting.
}

export default reconnect;
