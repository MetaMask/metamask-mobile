'use strict';
import { SmokeWalletPlatform } from '../../tags';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from '../multichain-accounts/common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../utils/Assertions';
import Matchers from '../../utils/Matchers';
import WalletView from '../../pages/wallet/WalletView';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await DeleteAccount.tapDeleteAccount();
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  it('deletes the account', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await goToAccountDetails(SIMPLE_KEYPAIR_ACCOUNT);
      await deleteAccount();
      // Go back to account list
      await WalletView.tapIdenticon();
      const name = Matchers.getElementByText(SIMPLE_KEYPAIR_ACCOUNT.name);
      await Assertions.checkIfNotVisible(name);
    });
  });
});
