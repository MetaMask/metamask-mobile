import { SmokeWalletPlatform } from '../../tags';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import WalletView from '../../pages/wallet/WalletView';
import TestHelpers from '../../helpers';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await Assertions.expectElementToBeVisible(DeleteAccount.container);
  await DeleteAccount.tapDeleteAccount();
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  beforeEach(async () => {
    await TestHelpers.reverseServerPort();
  });

  // TODO: Update test to be BIP-44 compatible
  // https://github.com/MetaMask/metamask-mobile/issues/24144
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('deletes the account', async () => {
    await withMultichainAccountDetailsEnabledFixtures(async () => {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
      );

      await goToAccountDetails(SIMPLE_KEYPAIR_ACCOUNT);
      await deleteAccount();
      // Go back to account list
      await WalletView.tapIdenticon();

      const importedAccountsSection =
        Matchers.getElementByText('Imported Accounts');
      await Assertions.expectElementToNotBeVisible(importedAccountsSection);
    });
  });
});
