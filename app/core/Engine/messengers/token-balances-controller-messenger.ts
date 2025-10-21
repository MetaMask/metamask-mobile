import type { Messenger } from '@metamask/base-controller';
import type { KeyringControllerAccountRemovedEvent } from '@metamask/keyring-controller';
import type {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListAccountsAction,
} from '@metamask/accounts-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';
import type {
  AccountTrackerControllerGetStateAction,
  AccountTrackerUpdateNativeBalancesAction,
  AccountTrackerUpdateStakedBalancesAction,
  TokensControllerGetStateAction,
  TokensControllerStateChangeEvent,
  TokenDetectionControllerAddDetectedTokensViaWsAction,
} from '@metamask/assets-controllers';
import type { AccountActivityServiceEvents } from '@metamask/core-backend';

type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetStateAction
  | TokensControllerGetStateAction
  | PreferencesControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction
  | AccountsControllerListAccountsAction
  | AccountTrackerControllerGetStateAction
  | AccountTrackerUpdateNativeBalancesAction
  | AccountTrackerUpdateStakedBalancesAction
  | TokenDetectionControllerAddDetectedTokensViaWsAction;
type AllowedEvents =
  | TokensControllerStateChangeEvent
  | PreferencesControllerStateChangeEvent
  | NetworkControllerStateChangeEvent
  | KeyringControllerAccountRemovedEvent
  | AccountActivityServiceEvents;

export type TokenBalancesControllerMessenger = ReturnType<
  typeof getTokenBalancesControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * token balances controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenBalancesControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'TokenBalancesController',
    allowedActions: [
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
    ],
    allowedEvents: [
      'TokensController:stateChange',
      'PreferencesController:stateChange',
      'NetworkController:stateChange',
      'KeyringController:accountRemoved',
      'AccountActivityService:balanceUpdated',
      'AccountActivityService:statusChanged',
    ],
  });
}

type AllowedInitializationActions = PreferencesControllerGetStateAction;

type AllowedInitializationEvents = never;

export type TokenBalancesControllerInitMessenger = ReturnType<
  typeof getTokenBalancesControllerInitMessenger
>;

/**
 * Get a messenger restricted to the initialization actions that the
 * token balances controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenBalancesControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'TokenBalancesControllerInit',
    allowedActions: ['PreferencesController:getState'],
    allowedEvents: [],
  });
}
