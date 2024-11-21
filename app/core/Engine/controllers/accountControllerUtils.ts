import {
  AccountsController,
  AccountsControllerMessenger,
  AccountsControllerState,
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
import { ControllerMessenger } from '../Engine.types';

// Default AccountsControllerState
export const defaultAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {},
    selectedAccount: '',
  },
};

/**
 * Creates instance of AccountsController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of AccountsController
 * @returns - AccountsController instance
 */
export const createAccountsController = ({
  messenger,
  initialState,
}: {
  messenger: ControllerMessenger;
  initialState?: AccountsControllerState;
}) => {
  const accountsControllerMessenger: AccountsControllerMessenger =
    messenger.getRestricted({
      name: 'AccountsController',
      allowedEvents: [
        'SnapController:stateChange',
        'KeyringController:accountRemoved',
        'KeyringController:stateChange',
      ],
      allowedActions: [
        'KeyringController:getAccounts',
        'KeyringController:getKeyringsByType',
        'KeyringController:getKeyringForAccount',
      ],
    });

  const accountsController = new AccountsController({
    messenger: accountsControllerMessenger,
    state: initialState ?? defaultAccountsControllerState,
  });

  return accountsController;
};

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
