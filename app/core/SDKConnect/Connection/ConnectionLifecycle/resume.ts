import DevLogger from '@core/SDKConnect/utils/DevLogger';
import { Connection } from '@core/SDKConnect/Connection';

function resume({ instance }: { instance: Connection }) {
  DevLogger.log(`Connection::resume() id=${instance.channelId}`);

  instance.remote.resume();

  instance.isResumed = true;

  instance.setLoading(false);
}

export default resume;
