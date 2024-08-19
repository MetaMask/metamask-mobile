import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

async function connect({
  withKeyExchange,
  instance,
  authorized,
}: {
  withKeyExchange: boolean;
  instance: Connection;
  authorized: boolean;
}) {
  DevLogger.log(
    `Connection::connect() id=${instance.channelId} withKeyExchange=${withKeyExchange} authorized=${authorized}`,
  );
  instance.remote.connectToChannel({
    channelId: instance.channelId,
    authorized,
    withKeyExchange,
  });
  instance.receivedDisconnect = false;
}

export default connect;
