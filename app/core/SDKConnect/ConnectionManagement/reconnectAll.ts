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
    if (channelId) {
      instance
        .reconnect({
          channelId,
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
    }
  });
  instance.state.reconnected = true;
  DevLogger.log(`SDKConnect::reconnectAll - done`);
}

export default reconnectAll;
