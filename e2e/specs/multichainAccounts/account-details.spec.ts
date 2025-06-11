'use strict';
import { SmokeWalletPlatform } from '../../tags';
import Assertions from '../../utils/Assertions';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../pages/MultichainAccounts/EditAccountName';
import ShareAddress from '../../pages/MultichainAccounts/ShareAddress';
import {
  HdAccount,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';

const checkAddress = async (expectedAddress: string) => {
  await AccountDetails.tapShareAddress();
  await Assertions.checkIfTextIsDisplayed(expectedAddress);
  await ShareAddress.tapCopyButton();
  await AccountDetails.tapBackButton();
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
      await goToAccountDetails(HdAccount);
      await editName('Account 1-edited');
    });
  });

  it('shows the account address in qr code format', async () => {
    await checkAddress(HdAccount.address);
  });

  it.skip('renames the wallet', async () => {
    // TODO: implement
  });
});
