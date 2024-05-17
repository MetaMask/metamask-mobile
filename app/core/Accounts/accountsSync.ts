import { AccountsController } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  PreferencesController,
  PreferencesState,
} from '@metamask/preferences-controller';

export function syncSelectedAddress(
  preferencesState: PreferencesState,
  getAccountsController: () => AccountsController,
  getPreferencesController: () => PreferencesController,
) {
  const accountsController = getAccountsController();
  const preferencesController = getPreferencesController();
  const selectedAddressFromPreferences = preferencesState.selectedAddress;
  const { selectedAccount: currentAccountId, accounts: internalAccounts } =
    accountsController.state.internalAccounts;
  const currentSelectedAccount = internalAccounts[currentAccountId];

  if (
    toChecksumHexAddress(currentSelectedAccount.address) !==
    toChecksumHexAddress(selectedAddressFromPreferences)
  ) {
    const checksumAddress = toChecksumHexAddress(
      selectedAddressFromPreferences,
    );
    const account = accountsController.getAccountByAddress(
      selectedAddressFromPreferences,
    );

    if (account) {
      accountsController.setSelectedAccount(account.id);
      preferencesController.setSelectedAddress(selectedAddressFromPreferences);
    } else {
      throw new Error(`Account not found for address: ${checksumAddress}`);
    }
  }
}

export function syncAccountName(
  preferencesState: PreferencesState,
  getAccountsController: () => AccountsController,
) {
  const accountsController = getAccountsController();

  // Iterate over all accounts in the AccountsController
  for (const accountId in accountsController.state.internalAccounts.accounts) {
    const account =
      accountsController.state.internalAccounts.accounts[accountId];
    const checksummedAddress = account.address;
    const lowercaseAddress = checksummedAddress.toLowerCase();

    // Find the corresponding preference entry using the lowercase address
    const preferenceEntry = Object.values(preferencesState.identities).find(
      (identity) => identity.address.toLowerCase() === lowercaseAddress,
    );

    // If a matching preference entry is found and names are different, update the account name using setAccountLabel method
    if (preferenceEntry && account.metadata.name !== preferenceEntry.name) {
      accountsController.setAccountName(account.id, preferenceEntry.name);
    }
  }
}
