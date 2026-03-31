import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountAssetListUpdatedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import { GetPermissions } from '@metamask/permission-controller';
import {
  SnapControllerGetAllSnapsAction,
  SnapControllerHandleRequestAction,
} from '@metamask/snaps-controllers';

export type MultichainAssetsControllerActions =
  | SnapControllerHandleRequestAction
  | SnapControllerGetAllSnapsAction
  | GetPermissions
  | AccountsControllerListMultichainAccountsAction;

export type MultichainAssetsControllerEvents =
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | AccountsControllerAccountAssetListUpdatedEvent;
