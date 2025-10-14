import { Messenger } from '@metamask/base-controller';
import type {
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type {
  TokensControllerGetStateAction,
  TokensControllerStateChangeEvent,
} from '@metamask/assets-controllers';

type AllowedActions =
  | TokensControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetStateAction
  | AccountsControllerGetAccountAction
  | AccountsControllerGetSelectedAccountAction;

type AllowedEvents =
  | TokensControllerStateChangeEvent
  | NetworkControllerStateChangeEvent
  | AccountsControllerSelectedEvmAccountChangeEvent;

export type TokenRatesControllerMessenger = ReturnType<
  typeof getTokenRatesControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * token detection controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenRatesControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'TokenRatesController',
    allowedActions: [
      'TokensController:getState',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'AccountsController:getAccount',
      'AccountsController:getSelectedAccount',
    ],
    allowedEvents: [
      'TokensController:stateChange',
      'NetworkController:stateChange',
      'AccountsController:selectedEvmAccountChange',
    ],
  });
}
