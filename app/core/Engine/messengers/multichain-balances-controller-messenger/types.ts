import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerAccountBalancesUpdatesEvent,
} from '@metamask/accounts-controller';
import { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import {
  MultichainAssetsControllerGetStateAction,
  MultichainAssetsControllerAccountAssetListUpdatedEvent,
} from '@metamask/assets-controllers';

export type MultichainBalancesControllerActions =
  | AccountsControllerListMultichainAccountsAction
  | SnapControllerHandleRequestAction
  | MultichainAssetsControllerGetStateAction;

export type MultichainBalancesControllerEvents =
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | AccountsControllerAccountBalancesUpdatesEvent
  | MultichainAssetsControllerAccountAssetListUpdatedEvent;
