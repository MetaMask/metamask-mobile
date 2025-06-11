'use strict';
import { SmokeWalletPlatform } from '../../tags';
import {
  SimpleKeyPairAccount,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../utils/Assertions';
import Matchers from '../../utils/Matchers';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccount();
  await DeleteAccount.tapDeleteAccount();
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  it('deletes the account', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await goToAccountDetails(SimpleKeyPairAccount);
      await deleteAccount();
      await AccountDetails.tapBackButton();
      const name = Matchers.getElementByText(SimpleKeyPairAccount.name);
      await Assertions.checkIfNotVisible(name);
    });
  });
});
