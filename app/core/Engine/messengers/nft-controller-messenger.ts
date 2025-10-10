import { Messenger } from '@metamask/base-controller';
import type { AddApprovalRequest } from '@metamask/approval-controller';
import type {
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import type {
  AssetsContractControllerGetERC1155BalanceOfAction,
  AssetsContractControllerGetERC1155TokenURIAction,
  AssetsContractControllerGetERC721AssetNameAction,
  AssetsContractControllerGetERC721AssetSymbolAction,
  AssetsContractControllerGetERC721OwnerOfAction,
  AssetsContractControllerGetERC721TokenURIAction,
} from '@metamask/assets-controllers';
import type { PhishingControllerBulkScanUrlsAction } from '@metamask/phishing-controller';
import type { PreferencesControllerStateChangeEvent } from '@metamask/preferences-controller';

type AllowedActions =
  | AddApprovalRequest
  | AccountsControllerGetAccountAction
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetNetworkClientByIdAction
  | AssetsContractControllerGetERC721AssetNameAction
  | AssetsContractControllerGetERC721AssetSymbolAction
  | AssetsContractControllerGetERC721TokenURIAction
  | AssetsContractControllerGetERC721OwnerOfAction
  | AssetsContractControllerGetERC1155BalanceOfAction
  | AssetsContractControllerGetERC1155TokenURIAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | PhishingControllerBulkScanUrlsAction;

type AllowedEvents =
  | PreferencesControllerStateChangeEvent
  | AccountsControllerSelectedEvmAccountChangeEvent;

export type NftControllerMessenger = ReturnType<
  typeof getNftControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * NFT controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getNftControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'NftController',
    allowedActions: [
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
    allowedEvents: [
      'PreferencesController:stateChange',
      'AccountsController:selectedEvmAccountChange',
    ],
  });
}
