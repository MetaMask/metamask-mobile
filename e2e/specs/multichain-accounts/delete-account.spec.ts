import { SmokeWalletPlatform } from '../../tags';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../framework/Assertions';
import Matchers from '../../utils/Matchers';
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

  it('deletes the account', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
      );
      if (device.getPlatform() === 'android') {
        await AccountListBottomSheet.scrollToBottomOfAccountList();
      } else {
        await AccountListBottomSheet.scrollToAccount(
          SIMPLE_KEYPAIR_ACCOUNT.index,
        );
      }
      await goToAccountDetails(SIMPLE_KEYPAIR_ACCOUNT);
      await deleteAccount();
      // Go back to account list
      await WalletView.tapIdenticon();
      const name = Matchers.getElementByText(SIMPLE_KEYPAIR_ACCOUNT.name);
      await Assertions.expectElementToNotBeVisible(name);
    });
  });
});
