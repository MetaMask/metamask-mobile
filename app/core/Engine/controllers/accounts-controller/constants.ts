import type { AccountsControllerState } from '@metamask/accounts-controller';

// Default AccountsControllerState
export const defaultAccountsControllerState: AccountsControllerState = {
  accountIdByAddress: {},
  internalAccounts: {
    accounts: {},
    selectedAccount: '',
  },
};
