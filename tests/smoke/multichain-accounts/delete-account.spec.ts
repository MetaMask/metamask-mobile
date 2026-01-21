import { SmokeWalletPlatform } from '../../tags';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../page-objects/MultichainAccounts/DeleteAccount';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import WalletView from '../../page-objects/wallet/WalletView';
import TestHelpers from '../../helpers';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await Assertions.expectElementToBeVisible(DeleteAccount.container);
  await DeleteAccount.tapDeleteAccount();
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  beforeEach(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('deletes the account', async () => {
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
