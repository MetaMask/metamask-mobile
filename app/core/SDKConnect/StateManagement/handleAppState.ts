import { KeyringController } from '@metamask/keyring-controller';
import Engine from '../../Engine';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import BackgroundTimer from 'react-native-background-timer';
import SDKConnect from '../SDKConnect';
import { TIMEOUT_PAUSE_CONNECTIONS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { wait, waitForKeychainUnlocked } from '../utils/wait.util';

async function handleAppState({
  appState,
  instance,
}: {
  appState: string;
  instance: SDKConnect;
}) {
  try {
    // Prevent double handling same app state
    if (instance.state.appState === appState) {
      DevLogger.log(
        `SDKConnect::_handleAppState - SKIP - same appState ${appState}`,
      );
      return;
    }

    DevLogger.log(`SDKConnect::_handleAppState appState=${appState}`);
    instance.state.appState = appState;
    if (appState === 'active') {
      // Close previous loading modal if any.
      instance.hideLoadingState().catch((err) => {
        DevLogger.log(
          `SDKConnect::_handleAppState - can't hide loading state`,
          err,
        );
      });
      DevLogger.log(
        `SDKConnect::_handleAppState - resuming - paused=${instance.state.paused}`,
        instance.state.timeout,
      );
      if (Device.isAndroid()) {
        if (instance.state.timeout) {
          BackgroundTimer.clearInterval(instance.state.timeout);
        }

        // Android cannot process deeplinks until keychain is unlocked and we want to process deeplinks first
        // so we wait for keychain to be unlocked before resuming connections.

        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;

        await waitForKeychainUnlocked({
          keyringController,
          context: 'handleAppState',
        });
      } else if (instance.state.timeout) {
        clearTimeout(instance.state.timeout);
      }
      instance.state.timeout = undefined;

      if (instance.state.paused) {
        // Reset connecting status when reconnecting from deeplink.
        const hasConnecting = Object.keys(instance.state.connecting).length > 0;
        if (hasConnecting) {
          console.warn(
            `SDKConnect::_handleAppState - resuming from pause - reset connecting status`,
          );
          instance.state.connecting = {};
        }
        const connectedCount = Object.keys(instance.state.connected).length;
        if (connectedCount > 0) {
          // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
          await wait(2000);
          DevLogger.log(
            `SDKConnect::_handleAppState - resuming ${connectedCount} connections`,
          );
          for (const id in instance.state.connected) {
            try {
              await instance.resume({ channelId: id });
            } catch (err) {
              // Ignore error, just log it.
              Logger.log(
                err,
                `SDKConnect::_handleAppState - can't resume ${id}`,
              );
            }
          }
        }
      }
      DevLogger.log(`SDKConnect::_handleAppState - done resuming`);
      instance.state.paused = false;
    } else if (appState === 'background') {
      if (!instance.state.paused) {
        /**
         * Pause connections after 20 seconds of the app being in background to respect device resources.
         * Also, OS closes the app if after 30 seconds, the connections are still open.
         */
        if (Device.isIos()) {
          BackgroundTimer.start();
          instance.state.timeout = setTimeout(() => {
            instance.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS) as unknown as number;
          BackgroundTimer.stop();
        } else if (Device.isAndroid()) {
          instance.state.timeout = BackgroundTimer.setTimeout(() => {
            instance.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS);
          // TODO manage interval clearTimeout
        }
      }
    }
  } catch (error) {
    console.error(`SDKConnect::_handleAppState - error`, error);
  }
}

export default handleAppState;
