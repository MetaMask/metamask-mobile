import Logger from '../../../../util/Logger';

import { MessageType } from '@metamask/sdk-communication-layer';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function disconnect({
  terminate,
  context,
  instance,
}: {
  instance: Connection;
  terminate: boolean;
  context?: string;
}) {
  DevLogger.log(
    `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate}`,
  );
  instance.receivedClientsReady = false;
  if (terminate) {
    instance.remote
      .sendMessage({
        type: MessageType.TERMINATE,
      })
      .catch((err) => {
        Logger.log(err, `Connection failed to send terminate`);
      });
  }
  instance.remote.disconnect();
}

export default disconnect;
