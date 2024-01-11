import { KeyringController } from '@metamask/keyring-controller';
import Logger from '../../../../util/Logger';
import Engine from '../../../Engine';
import DevLogger from '../../utils/DevLogger';
import { waitForKeychainUnlocked } from '../../utils/wait.util';
import { Connection } from '../Connection';

function handleClientsConnected(instance: Connection) {
  return async () => {
    DevLogger.log(
      `Connection::CLIENTS_CONNECTED id=${instance.channelId} receivedDisconnect=${instance.receivedDisconnect} origin=${instance.origin}`,
    );
    instance.setLoading(true);
    instance.receivedDisconnect = false;

    try {
      // Auto hide 3seconds after keychain has unlocked if 'ready' wasn't received
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;

      await waitForKeychainUnlocked({ keyringController });
      setTimeout(() => {
        if (instance._loading) {
          DevLogger.log(
            `Connection::CLIENTS_CONNECTED auto-hide loading after 4s`,
          );
          instance.setLoading(false);
        }
      }, 4000);
    } catch (error) {
      Logger.log(
        error as Error,
        `Connection::CLIENTS_CONNECTED error while waiting for keychain to be unlocked`,
      );
    }
  };
}

export default handleClientsConnected;
