import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function handleClientsWaiting({ instance }: { instance: Connection }) {
  return () => {
    DevLogger.log(
      `handleClientsWaiting:: dapp not connected`,
      instance.channelId,
    );
    instance.setLoading(false);
    // TODO - validate connection behavior if disconnect or maintain. Keeping it for now
    // instance.disconnect({ terminate: false, context: 'CLIENTS_WAITING' });
  };
}

export default handleClientsWaiting;
