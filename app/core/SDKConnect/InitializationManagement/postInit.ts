import { KeyringController } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { AppState } from 'react-native';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from '../utils/wait.util';

async function postInit(instance: SDKConnect, callback?: () => void) {
  if (!instance.state._initialized) {
    throw new Error(`SDKConnect::postInit() - not initialized`);
  }

  if (instance.state._postInitializing) {
    DevLogger.log(
      `SDKConnect::postInit() -- already doing post init -- wait for completion`,
    );
    // Wait for initialization to finish.
    await waitForCondition({
      fn: () => instance.state._postInitialized,
      context: 'post_init',
    });
    DevLogger.log(
      `SDKConnect::postInit() -- done waiting for post initialization`,
    );
    return;
  } else if (instance.state._postInitialized) {
    DevLogger.log(`SDKConnect::postInit() -- SKIP -- already post initialized`);
    return;
  }

  instance.state._postInitializing = true;

  const keyringController = (
    Engine.context as { KeyringController: KeyringController }
  ).KeyringController;
  DevLogger.log(
    `SDKConnect::postInit() - check keychain unlocked=${keyringController.isUnlocked()}`,
  );

  await waitForKeychainUnlocked({ keyringController, context: 'init' });
  instance.state.appStateListener = AppState.addEventListener(
    'change',
    instance._handleAppState.bind(instance),
  );

  // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
  await wait(3000);
  await instance.reconnectAll();

  instance.state._postInitialized = true;
  DevLogger.log(`SDKConnect::postInit() - done`);

  callback?.();
}

export default postInit;
