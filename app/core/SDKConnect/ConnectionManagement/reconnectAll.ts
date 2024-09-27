import Logger from '../../../util/Logger';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

async function reconnectAll(instance: SDKConnect) {
  DevLogger.log(
    `SDKConnect::reconnectAll paused=${instance.state.paused} reconnected=${instance.state.reconnected}`,
  );

  if (instance.state.reconnected) {
    DevLogger.log(`SDKConnect::reconnectAll - already reconnected`);
    return;
  }

  const channelIds = Object.keys(instance.state.connections);

  channelIds.forEach((channelId) => {
    const connection = instance.state.connections[channelId];
    const connecting = instance.state.connecting[channelId];
    const connected = instance.getConnected()?.[channelId]?.remote.isConnected() ?? false;
    if (
      !connecting && !connected
    ) {
      DevLogger.log(
        `SDKConnect::reconnectAll - reconnecting to ${channelId} origin=${connection.origin} relayPersistence=${connection.relayPersistence} protocolVersion=${connection.protocolVersion}`,
      );
      instance
        .reconnect({
          channelId,
          protocolVersion: connection.protocolVersion,
          otherPublicKey: instance.state.connections[channelId].otherPublicKey,
          initialConnection: false,
          trigger: 'reconnect',
          context: 'reconnectAll',
        })
        .catch((err) => {
          Logger.log(
            err,
            `SDKConnect::reconnectAll error reconnecting to ${channelId}`,
          );
        });
    } else {
      DevLogger.log(
        `SDKConnect::reconnectAll -- SKIP connected / connecting -- ${channelId} connected=${connected} connecting=${connecting} origin=${connection.origin} relayPersistence=${connection.relayPersistence} protocolVersion=${connection.protocolVersion}`,
      );
    }
  });
  instance.state.reconnected = true;
  DevLogger.log(
    `SDKConnect::reconnectAll - channelIds=${channelIds.length} - done`,
  );
}

export default reconnectAll;
