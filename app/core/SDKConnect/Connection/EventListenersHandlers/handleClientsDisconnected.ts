import AppConstants from '../../../AppConstants';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function handleClientsDisconnected({
  instance,
  disapprove,
}: {
  instance: Connection;
  disapprove: (channelId: string) => void;
}) {
  return () => {
    instance.setLoading(false);
    DevLogger.log(
      `Connection::CLIENTS_DISCONNECTED id=${
        instance.channelId
      } paused=${instance.remote.isPaused()} ready=${instance.isReady} origin=${
        instance.origin
      }`,
    );

    // Disapprove a given host everytime there is a disconnection to prevent hijacking.
    if (!instance.remote.isPaused()) {
      // don't disapprove on deeplink
      if (instance.origin !== AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
        disapprove(instance.channelId);
      }
      instance.initialConnection = false;
      instance.otps = undefined;
    }

    // detect interruption of connection (can happen on mobile browser ios) - We need to warm the user to redo the connection.
    if (!instance.receivedClientsReady && !instance.remote.isPaused()) {
      // Only disconnect on deeplinks
      if (instance.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
        // SOCKET CONNECTION WAS INTERRUPTED
        console.warn(
          `Connected::clients_disconnected dApp connection disconnected before ready`,
        );
        // Terminate to prevent bypassing initial approval when auto-reconnect on deeplink.
        instance.disconnect({
          terminate: true,
          context: 'CLIENTS_DISCONNECTED',
        });
      }
    }

    instance.receivedDisconnect = true;
    if (!instance.remote.hasRelayPersistence()) {
      // Reset connection state
      instance.isReady = false;
      instance.approvalPromise = undefined;
      instance.receivedClientsReady = false;
      DevLogger.log(
        `Connection::CLIENTS_DISCONNECTED id=${instance.channelId} switch isReady ==> false`,
      );
    }
  };
}

export default handleClientsDisconnected;
