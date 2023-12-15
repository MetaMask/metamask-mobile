import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function removeConnection({
  terminate,
  context,
  instance,
}: {
  instance: Connection;
  terminate: boolean;
  context?: string;
}) {
  instance.isReady = false;
  instance.lastAuthorized = 0;
  instance.authorizedSent = false;
  DevLogger.log(
    `Connection::removeConnection() context=${context} id=${instance.channelId}`,
  );
  instance.disapprove(instance.channelId);
  instance.disconnect({ terminate, context: 'Connection::removeConnection' });
  instance.backgroundBridge?.onDisconnect();
  instance.setLoading(false);
}

export default removeConnection;
