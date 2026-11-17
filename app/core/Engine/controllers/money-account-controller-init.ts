import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountController,
  MoneyAccountControllerMessenger,
} from '@metamask/money-account-controller';
import { MoneyAccountControllerInitMessenger } from '../messengers/money-account-controller-messenger';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

/**
 * Initialize the money account controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The messenger to use for initialization.
 * @param request.persistedState - The persisted state to restore.
 * @returns The initialized controller.
 */
export const moneyAccountControllerInit: MessengerClientInitFunction<
  MoneyAccountController,
  MoneyAccountControllerMessenger,
  MoneyAccountControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new MoneyAccountController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountController,
  });

  // Re-check the Money account feature flag whenever remote flags are updated.
  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    async ({ remoteFeatureFlags }) => {
      try {
        const isEnabled = isMoneyAccountEnabled(remoteFeatureFlags);
        const hasMoneyAccount =
          Object.keys(controller.state.moneyAccounts).length > 0;

        if (isEnabled && !hasMoneyAccount) {
          const { isUnlocked } = initMessenger.call(
            'KeyringController:getState',
          );
          // Check for the `KeyringController` to be unlocked, otherwise we won't be able
          // to create the Money keyring if it doesn't exist yet!
          if (isUnlocked) {
            // This call is idempotent, so it is safe to call even if the
            // controller is already initialized.
            await controller.init();
          }
        } else if (!isEnabled && hasMoneyAccount) {
          // Clear state if we had a previous Money account and FF is off.
          controller.clearState();
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'MoneyAccountController: error handling RemoteFeatureFlagController state change',
        );
      }
    },
  );

  return { controller };
};
