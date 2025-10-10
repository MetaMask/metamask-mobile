import { Messenger } from '@metamask/base-controller';
import type { AddApprovalRequest } from '@metamask/approval-controller';
import type {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';
import type { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';

type AllowedActions =
  | AddApprovalRequest
  | NetworkControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction
  | PreferencesControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerFindNetworkClientIdByChainIdAction;

type AllowedEvents =
  | PreferencesControllerStateChangeEvent
  | NetworkControllerStateChangeEvent;

export type NftDetectionControllerMessenger = ReturnType<
  typeof getNftDetectionControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * NFT detection controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getNftDetectionControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'NftDetectionController',

    allowedActions: [
      'ApprovalController:addRequest',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'PreferencesController:getState',
      'AccountsController:getSelectedAccount',
      'NetworkController:findNetworkClientIdByChainId',
    ],
    allowedEvents: [
      'NetworkController:stateChange',
      'PreferencesController:stateChange',
    ],
  });
}
