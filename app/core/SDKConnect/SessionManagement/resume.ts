import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';

async function resume({
  channelId,
  instance,
}: {
  channelId: string;
  instance: SDKConnect;
}) {
  const session = instance.state.connected[channelId]?.remote;
  const alreadyResumed = instance.state.connected[channelId].isResumed ?? false;

  DevLogger.log(
    `SDKConnect::resume channel=${channelId} alreadyResumed=${alreadyResumed} session=${session} paused=${session.isPaused()} connected=${session?.isConnected()} connecting=${
      instance.state.connecting[channelId]
    }`,
  );
  if (
    session &&
    !session?.isConnected() &&
    !alreadyResumed &&
    !instance.state.connecting[channelId]
  ) {
    instance.state.connected[channelId].resume();
    await wait(500); // Some devices (especially android) need time to update socket status after resuming.
    DevLogger.log(
      `SDKConnect::_handleAppState - done resuming - socket_connected=${instance.state.connected[
        channelId
      ].remote.isConnected()}`,
    );
  } else {
    DevLogger.log(
      `SDKConnect::_handleAppState - SKIP - connection.resumed=${instance.state.connected[channelId]?.isResumed}`,
    );
  }
}

export default resume;
