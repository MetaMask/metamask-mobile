import { SmokeWalletPlatform } from '../../../e2e/tags';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import AccountDetails from '../../../e2e/pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../../e2e/pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import TestHelpers from '../../../e2e/helpers';
import AccountListBottomSheet from '../../../e2e/pages/wallet/AccountListBottomSheet';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await Assertions.expectElementToBeVisible(DeleteAccount.container);
  await DeleteAccount.tapDeleteAccount();
};

// TODO: Update test to be BIP-44 compatible
// https://github.com/MetaMask/metamask-mobile/issues/24144
// eslint-disable-next-line jest/no-disabled-tests
describe.skip(
  SmokeWalletPlatform('Multichain Accounts: Account Details'),
  () => {
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
  },
);
