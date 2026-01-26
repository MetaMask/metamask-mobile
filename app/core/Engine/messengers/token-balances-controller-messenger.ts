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
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'PreferencesController:getState',
      'TokensController:getState',
      'TokenDetectionController:addDetectedTokensViaPolling',
      'TokenDetectionController:addDetectedTokensViaWs',
      'TokenDetectionController:detectTokens',
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
      'AccountTrackerController:getState',
      'AccountTrackerController:updateNativeBalances',
      'AccountTrackerController:updateStakedBalances',
      'KeyringController:getState',
      'AuthenticationController:getBearerToken',
    ],
    events: [
      'NetworkController:stateChange',
      'PreferencesController:stateChange',
      'TokensController:stateChange',
      'KeyringController:accountRemoved',
      'KeyringController:lock',
      'KeyringController:unlock',
      'AccountActivityService:balanceUpdated',
      'AccountActivityService:statusChanged',
      'AccountsController:selectedEvmAccountChange',
      'TransactionController:transactionConfirmed',
      'TransactionController:incomingTransactionsReceived',
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
