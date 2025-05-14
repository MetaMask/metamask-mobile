import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountAssetListUpdatedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import { GetPermissions } from '@metamask/permission-controller';
import { GetAllSnaps, HandleSnapRequest } from '@metamask/snaps-controllers';

export type MultichainAssetsControllerActions =
  | HandleSnapRequest
  | GetAllSnaps
  | GetPermissions
  | AccountsControllerListMultichainAccountsAction;

export type MultichainAssetsControllerEvents =
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | AccountsControllerAccountAssetListUpdatedEvent;
