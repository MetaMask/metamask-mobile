import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function resume({ instance }: { instance: Connection }) {
  DevLogger.log(`Connection::resume() id=${instance.channelId}`);

  instance.remote.resume();

  instance.isResumed = true;

  instance.setLoading(false);
}

export default resume;
