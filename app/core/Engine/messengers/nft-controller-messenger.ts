import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { NftControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the NFT controller. This is scoped to the
 * NFT controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NftControllerMessenger.
 */
export function getNftControllerMessenger(
  rootMessenger: RootMessenger,
): NftControllerMessenger {
  const messenger = new Messenger<
    'NftController',
    MessengerActions<NftControllerMessenger>,
    MessengerEvents<NftControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NftController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getAccount',
      'AccountsController:getSelectedAccount',
      'ApprovalController:addRequest',
      'AssetsContractController:getERC721AssetName',
      'AssetsContractController:getERC721AssetSymbol',
      'AssetsContractController:getERC721TokenURI',
      'AssetsContractController:getERC721OwnerOf',
      'AssetsContractController:getERC1155BalanceOf',
      'AssetsContractController:getERC1155TokenURI',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'PhishingController:bulkScanUrls',
    ],
    events: [
      'PreferencesController:stateChange',
      'AccountsController:selectedEvmAccountChange',
    ],
    messenger,
  });
  return messenger;
}
