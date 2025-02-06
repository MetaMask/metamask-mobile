import { KeyringController } from '@metamask/keyring-controller';
import { AppState } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import {
  waitForCondition,
  waitForKeychainUnlocked
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

  let currentRouteName = instance.state.navigation?.getCurrentRoute()?.name;
  DevLogger.log(`SDKConnect::postInit() - currentRouteName=${currentRouteName}`);

  const waitRoutes = [Routes.LOCK_SCREEN, Routes.ONBOARDING.LOGIN];
  await waitForCondition({
    fn: () => {
      currentRouteName = instance.state.navigation?.getCurrentRoute()?.name;
      return !waitRoutes.includes(currentRouteName ?? '');
    },
    context: 'post_init',
    waitTime: 1000,
  });
  DevLogger.log(`SDKConnect::postInit() - currentRouteName=${currentRouteName} - start reconnectAll`);

  // Also wait for user to be logged in (outside of login screen)
  instance.state.appStateListener = AppState.addEventListener(
    'change',
    instance._handleAppState.bind(instance),
  );

  DevLogger.log(`SDKConnect::postInit() - keychain unlocked -- wait for reconnectAll`);
  await instance.reconnectAll();

  instance.state._postInitialized = true;
  DevLogger.log(`SDKConnect::postInit() - done`);

  callback?.();
}

export default postInit;
