import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { NftDetectionControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the messenger for the NFT detection controller. This is scoped to the
 * NFT detection controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NftDetectionControllerMessenger.
 */
export function getNftDetectionControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NftDetectionControllerMessenger>,
    MessengerEvents<NftDetectionControllerMessenger>
  >,
): NftDetectionControllerMessenger {
  const messenger: NftDetectionControllerMessenger = new Messenger({
    namespace: 'NftDetectionController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ApprovalController:addRequest',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'PreferencesController:getState',
      'AccountsController:getSelectedAccount',
      'NetworkController:findNetworkClientIdByChainId',
    ],
    events: [
      'NetworkController:stateChange',
      'PreferencesController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
