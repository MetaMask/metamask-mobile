
import { MessageType } from '@metamask/sdk-communication-layer';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

async function disconnect({
  terminate,
  context,
  instance,
}: {
  instance: Connection;
  terminate: boolean;
  context?: string;
}): Promise<boolean> {
  DevLogger.log(
    `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate}`,
  );
  instance.receivedClientsReady = false;
  let terminated = false;
  if (terminate) {
    DevLogger.log(`Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sending terminate`);
    terminated = await instance.remote
      .sendMessage({
        type: MessageType.TERMINATE,
      });
    DevLogger.log(`Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sent terminate=${terminated}`);
  }
  if(terminated) {
    instance.remote.disconnect();
  }
  return terminated;
}

export default disconnect;
