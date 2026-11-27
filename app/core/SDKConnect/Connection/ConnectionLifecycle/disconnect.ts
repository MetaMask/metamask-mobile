import { MessageType } from '@metamask/sdk-communication-layer';
import { removeOriginProvenance } from '../../../OriginProvenance';
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
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sending terminate`,
    );
    try {
      terminated = await instance.remote.sendMessage({
        type: MessageType.TERMINATE,
      });
    } catch (error) {
      DevLogger.log(
        `Connection::disconnect() context=${context} id=${instance.channelId} terminate send failed`,
        error,
      );
    }
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sent terminate=${terminated}`,
    );
    // The user asked to end the session. Close the socket and drop the origin
    // stamp even when the remote does not ack, so the channel cannot keep its
    // authority for a later reconnect.
    instance.remote.disconnect();
    removeOriginProvenance(instance.channelId);
    return true;
  }
  return terminated;
}

export default disconnect;
