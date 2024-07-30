import { resetConnections } from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import { Connection, ConnectionProps } from '../Connection';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { SDKConnect } from './../SDKConnect';

async function connectToChannel({
  id,
  trigger,
  otherPublicKey,
  protocolVersion,
  origin,
  validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
  instance,
}: ConnectionProps & {
  instance: SDKConnect;
}) {
  const existingConnection = instance.state.connected[id] !== undefined;
  const isReady = existingConnection && instance.state.connected[id].isReady;

  DevLogger.log(
    `SDKConnect::connectToChannel id=${id} trigger=${trigger} isReady=${isReady} existingConnection=${existingConnection}`,
  );

  if (isReady) {
    DevLogger.log(`SDKConnect::connectToChannel - INTERRUPT  - already ready`);
    // Nothing to do, already connected.
    return;
  }

  // Check if it was previously paused so that it first resume connection.
  if (existingConnection && !instance.state.paused) {
    DevLogger.log(
      `SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --`,
    );
    // if paused --- wait for resume --- otherwise reconnect.
    await instance.reconnect({
      channelId: id,
      initialConnection: false,
      protocolVersion,
      trigger,
      otherPublicKey:
        instance.state.connected[id].remote.getKeyInfo()?.ecies.otherPubKey ??
        '',
      context: 'connectToChannel',
    });
    return;
  } else if (existingConnection && instance.state.paused) {
    DevLogger.log(
      `SDKConnect::connectToChannel - INTERRUPT - connection is paused`,
    );
    return;
  }

  instance.state.connecting[id] = true;
  const initialConnection = instance.state.approvedHosts[id] === undefined;

  instance.state.connections[id] = {
    id,
    otherPublicKey,
    origin,
    initialConnection,
    validUntil,
    lastAuthorized: initialConnection ? 0 : instance.state.approvedHosts[id],
  };

  DevLogger.log(
    `SDKConnect connections[${id}]`,
    instance.state.connections[id],
  );

  instance.state.connected[id] = new Connection({
    ...instance.state.connections[id],
    socketServerUrl: instance.state.socketServerUrl,
    protocolVersion,
    initialConnection,
    trigger,
    rpcQueueManager: instance.state.rpcqueueManager,
    navigation: instance.state.navigation,
    updateOriginatorInfos: instance.updateOriginatorInfos.bind(instance),
    approveHost: instance._approveHost.bind(instance),
    disapprove: instance.disapproveChannel.bind(instance),
    getApprovedHosts: instance.getApprovedHosts.bind(instance),
    revalidate: instance.revalidateChannel.bind(instance),
    isApproved: instance.isApproved.bind(instance),
    onTerminate: ({
      channelId,
      sendTerminate,
    }: {
      channelId: string;
      sendTerminate?: boolean;
    }) => {
      instance.removeChannel({ channelId, sendTerminate });
    },
  });

  // Update state with local privateKey info, stored for relayPersistence
  const privateKey =
    instance.state.connected[id].remote.getKeyInfo()?.ecies.private;
  instance.state.connections[id].privateKey = privateKey;
  instance.state.connections[id].protocolVersion = protocolVersion ?? 1;

  // Make sure to watch event before you connect
  instance.watchConnection(instance.state.connected[id]);

  store.dispatch(resetConnections(instance.state.connections));

  // Initialize connection
  instance.state.connected[id].connect({
    withKeyExchange: true,
  });
  instance.state.connecting[id] = false;
}

export default connectToChannel;
