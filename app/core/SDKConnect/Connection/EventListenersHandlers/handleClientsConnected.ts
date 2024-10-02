import { KeyringController } from '@metamask/keyring-controller';
import Logger from '@util/Logger';
import Engine from '@core/Engine';
import DevLogger from '@core/SDKConnect/utils/DevLogger';
import { waitForKeychainUnlocked } from '@core/SDKConnect/utils/wait.util';
import { Connection } from '@core/SDKConnect/Connection';

function handleClientsConnected(instance: Connection) {
  return async () => {
    DevLogger.log(
      `Connection::CLIENTS_CONNECTED id=${instance.channelId} receivedDisconnect=${instance.receivedDisconnect} origin=${instance.origin}`,
    );
    instance.receivedDisconnect = false;

    try {
      // Auto hide 3seconds after keychain has unlocked if 'ready' wasn't received
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;

      await waitForKeychainUnlocked({ keyringController });
    } catch (error) {
      Logger.log(
        error as Error,
        `Connection::CLIENTS_CONNECTED error while waiting for keychain to be unlocked`,
      );
    }
  };
}

export default handleClientsConnected;
