'use strict';
import { SmokeWalletPlatform } from '../../tags';
import Assertions from '../../utils/Assertions';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../pages/MultichainAccounts/EditAccountName';
import ShareAddress from '../../pages/MultichainAccounts/ShareAddress';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';

const checkAddress = async (expectedAddress: string) => {
  await AccountDetails.tapShareAddress();
  await Assertions.checkIfTextIsDisplayed(expectedAddress);
  await ShareAddress.tapCopyButton();
};

const editName = async (newName: string) => {
  await AccountDetails.tapEditAccountName();
  await EditAccountName.updateAccountName(newName);
  await EditAccountName.tapSave();
  await Assertions.checkIfTextIsDisplayed(newName);
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  it('renames the account', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await goToAccountDetails(HD_ACCOUNT);
      await editName('Account 1-edited');
    });
  });

  it('copies the account address', async () => {
    await checkAddress(HD_ACCOUNT.address);
  });

  it.skip('renames the wallet', async () => {
    // TODO: implement
  });
});
