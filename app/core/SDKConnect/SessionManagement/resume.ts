import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

async function resume({
  channelId,
  instance,
}: {
  channelId: string;
  instance: SDKConnect;
}) {
  const connection = instance.state.connected[channelId];
  if (!connection) {
    DevLogger.log(
      `SDKConnect::resume - No connection found for channel ${channelId}, skipping resume.`,
    );
    return;
  }
  DevLogger.log(`SDKConnect::resume - Resuming connection ${channelId}`);
  // Unconditionally call resume on the connection object.
  connection.resume();
}

export default resume;
