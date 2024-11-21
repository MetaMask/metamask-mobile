import {
  AccountsControllerGetAccountByAddressAction as AccountsControllerGetAccountByAddressActionType,
  AccountsControllerSetAccountNameAction as AccountsControllerSetAccountNameActionType,
  AccountsControllerSetSelectedAccountAction as AccountsControllerSetSelectedAccountActionType,
  AccountsControllerGetAccountAction as AccountsControllerGetAccountActionType,
  AccountsControllerGetSelectedAccountAction as AccountsControllerGetSelectedAccountActionType,
  AccountsControllerListAccountsAction as AccountsControllerListAccountsActionType,
  AccountsControllerUpdateAccountMetadataAction as AccountsControllerUpdateAccountMetadataActionType,
  AccountsControllerSelectedEvmAccountChangeEvent as AccountsControllerSelectedEvmAccountChangeEventType,
  AccountsControllerSelectedAccountChangeEvent as AccountsControllerSelectedAccountChangeEventType,
  AccountsControllerAccountAddedEvent as AccountsControllerAccountAddedEventType,
  AccountsControllerAccountRenamedEvent as AccountsControllerAccountRenamedEventType,
} from '@metamask/accounts-controller';

// Action types of AccountsController
export const AccountsControllerGetAccountByAddressAction: AccountsControllerGetAccountByAddressActionType['type'] =
  'AccountsController:getAccountByAddress';
export const AccountsControllerSetAccountNameAction: AccountsControllerSetAccountNameActionType['type'] =
  'AccountsController:setAccountName';
export const AccountsControllerGetAccountAction: AccountsControllerGetAccountActionType['type'] =
  'AccountsController:getAccount';
export const AccountsControllerGetSelectedAccountAction: AccountsControllerGetSelectedAccountActionType['type'] =
  'AccountsController:getSelectedAccount';
export const AccountsControllerSetSelectedAccountAction: AccountsControllerSetSelectedAccountActionType['type'] =
  'AccountsController:setSelectedAccount';
export const AccountsControllerListAccountsAction: AccountsControllerListAccountsActionType['type'] =
  'AccountsController:listAccounts';
export const AccountsControllerUpdateAccountMetadataAction: AccountsControllerUpdateAccountMetadataActionType['type'] =
  'AccountsController:updateAccountMetadata';

// Events of AccountsController
export const AccountsControllerSelectedEvmAccountChangeEvent: AccountsControllerSelectedEvmAccountChangeEventType['type'] =
  'AccountsController:selectedEvmAccountChange';
export const AccountsControllerSelectedAccountChangeEvent: AccountsControllerSelectedAccountChangeEventType['type'] =
  'AccountsController:selectedAccountChange';
export const AccountsControllerAccountAddedEvent: AccountsControllerAccountAddedEventType['type'] =
  'AccountsController:accountAdded';
export const AccountsControllerAccountRenamedEvent: AccountsControllerAccountRenamedEventType['type'] =
  'AccountsController:accountRenamed';
