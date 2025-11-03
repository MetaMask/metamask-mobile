import { ControllerInitFunction } from '../types';
import {
  TokenBalancesController,
  type TokenBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenBalancesControllerInitMessenger } from '../messengers/token-balances-controller-messenger';
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
    // TODO: This is long, can we decrease it?
    interval: 180_000,
    allowExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    queryMultipleAccounts: preferencesState.isMultiAccountBalancesEnabled,
    accountsApiChainIds: () => [
      '0x1',
      '0xe708',
      '0x38',
      '0x89',
      '0x2105',
      '0xa',
      '0xa4b1',
      '0x531',
      '0x82750',
    ],
  });

  return {
    controller,
  };
};
