import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type { TokenBalancesControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the token balances controller. This is scoped to the
 * token balances controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenBalancesControllerMessenger.
 */
export function getTokenBalancesControllerMessenger(
  rootMessenger: RootMessenger,
): TokenBalancesControllerMessenger {
  const messenger = new Messenger<
    'TokenBalancesController',
    MessengerActions<TokenBalancesControllerMessenger>,
    MessengerEvents<TokenBalancesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenBalancesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'TokensController:getState',
      'PreferencesController:getState',
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
      'AccountTrackerController:getState',
      'AccountTrackerController:updateNativeBalances',
      'AccountTrackerController:updateStakedBalances',
      'TokenDetectionController:addDetectedTokensViaWs',
      'AuthenticationController:getBearerToken',
    ],
    events: [
      'TokensController:stateChange',
      'PreferencesController:stateChange',
      'NetworkController:stateChange',
      'KeyringController:accountRemoved',
      'AccountActivityService:balanceUpdated',
      'AccountActivityService:statusChanged',
      'AccountsController:selectedEvmAccountChange',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions = PreferencesControllerGetStateAction;

type AllowedInitializationEvents = never;

export type TokenBalancesControllerInitMessenger = ReturnType<
  typeof getTokenBalancesControllerInitMessenger
>;

/**
 * Get the messenger for the token balances controller initialization. This is scoped to the
 * actions and events that the token balances controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenBalancesControllerInitMessenger.
 */
export function getTokenBalancesControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'TokenBalancesControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'TokenBalancesControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['PreferencesController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
