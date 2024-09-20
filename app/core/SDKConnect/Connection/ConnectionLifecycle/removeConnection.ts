import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

async function removeConnection({
  terminate,
  context,
  instance,
}: {
  instance: Connection;
  terminate: boolean;
  context?: string;
}): Promise<boolean> {

  const disconnected = await instance.disconnect({ terminate, context: 'Connection::removeConnection' });
  DevLogger.log(`Connection::removeConnection() context=${context} id=${instance.channelId} disconnected=${disconnected}`);
  if (disconnected) {
    instance.backgroundBridge?.onDisconnect();
    instance.isReady = false;
    instance.lastAuthorized = 0;
    instance.authorizedSent = false;
    DevLogger.log(
      `Connection::removeConnection() context=${context} id=${instance.channelId}`,
    );
    instance.disapprove(instance.channelId);
  }
  instance.approvalPromise = undefined;
  instance.setLoading(false);
  return disconnected;
}

export default removeConnection;
