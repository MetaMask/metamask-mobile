import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function connect({
  withKeyExchange,
  instance,
}: {
  withKeyExchange: boolean;
  instance: Connection;
}) {
  DevLogger.log(
    `Connection::connect() withKeyExchange=${withKeyExchange} id=${instance.channelId}`,
  );
  instance.remote.connectToChannel({
    channelId: instance.channelId,
    withKeyExchange,
  });
  instance.receivedDisconnect = false;
  instance.setLoading(true);
}

export default connect;
