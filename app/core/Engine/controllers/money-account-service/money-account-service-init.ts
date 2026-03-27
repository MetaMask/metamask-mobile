import { MoneyAccountService } from './money-account-service';
import { MoneyAccountServiceMessenger } from './types';
import { ControllerInitFunction } from '../../types';
import { MoneyAccountServiceInitMessenger } from '../../messengers/money-account-service-messenger/money-account-service-messenger';
import { isMoneyAccountsFeatureEnabled } from '../../../../money-account/remote-feature-flag';
import { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import Logger from '../../../../util/Logger';

/**
 * Initialize the money account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.initMessenger - The messenger to use during initialization.
 * @returns The initialized service.
 */
export const moneyAccountServiceInit: ControllerInitFunction<
  MoneyAccountService,
  MoneyAccountServiceMessenger,
  MoneyAccountServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  Logger.log(
    '[MoneyAccount] moneyAccountServiceInit: constructing MoneyAccountService',
  );
  const controller = new MoneyAccountService({
    messenger: controllerMessenger,
  });
  Logger.log(
    '[MoneyAccount] moneyAccountServiceInit: MoneyAccountService constructed',
    controller,
  );

  const initialRemoteFeatureFlagsState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  // Currently hardcoded to true via isMoneyAccountsFeatureEnabled.
  // Subscribe to state changes so the flag can be wired up for real values later.
  let currentEnabled = isMoneyAccountsFeatureEnabled(
    initialRemoteFeatureFlagsState.remoteFeatureFlags.moneyAccounts,
  );
  Logger.log(
    '[MoneyAccount] moneyAccountServiceInit: initial feature flag enabled =',
    currentEnabled,
  );

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    (state: RemoteFeatureFlagControllerState) => {
      const enabled = isMoneyAccountsFeatureEnabled(
        state.remoteFeatureFlags.moneyAccounts,
      );
      Logger.log(
        '[MoneyAccount] moneyAccountServiceInit: feature flag state changed, enabled =',
        enabled,
      );

      if (enabled !== currentEnabled) {
        currentEnabled = enabled;
      }
    },
  );

  Logger.log('[MoneyAccount] moneyAccountServiceInit: complete');
  return { controller, memStateKey: null, persistedStateKey: null };
};
