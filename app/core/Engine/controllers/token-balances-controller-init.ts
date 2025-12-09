import { ControllerInitFunction, EngineState } from '../types';
import {
  TokenBalancesController,
  type TokenBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenBalancesControllerInitMessenger } from '../messengers/token-balances-controller-messenger';
import { selectAssetsAccountApiBalancesEnabled } from '../../../selectors/featureFlagController/assetsAccountApiBalances';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

/**
 * Initialize the token balances controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenBalancesControllerInit: ControllerInitFunction<
  TokenBalancesController,
  TokenBalancesControllerMessenger,
  TokenBalancesControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState, getState }) => {
  const preferencesState = initMessenger.call('PreferencesController:getState');

  const controller = new TokenBalancesController({
    messenger: controllerMessenger,
    state: persistedState.TokenBalancesController,
    interval: 30_000,
    allowExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    queryMultipleAccounts: preferencesState.isMultiAccountBalancesEnabled,
    accountsApiChainIds: () =>
      selectAssetsAccountApiBalancesEnabled({
        engine: { backgroundState: persistedState as EngineState },
      }) as `0x${string}`[],
  });

  return {
    controller,
  };
};
