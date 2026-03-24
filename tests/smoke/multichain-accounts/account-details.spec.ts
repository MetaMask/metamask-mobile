import { RegressionWalletPlatform } from '../../tags';
import Assertions from '../../framework/Assertions';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import EditAccountName from '../../page-objects/MultichainAccounts/EditAccountName';
import ShareAddress from '../../page-objects/MultichainAccounts/ShareAddress';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import TestHelpers from '../../helpers';

const checkAddress = async (expectedAddress: string) => {
  await AccountDetails.tapShareAddress();
  await Assertions.expectTextDisplayed(expectedAddress);
  await ShareAddress.tapCopyButton();
};

const editName = async (newName: string) => {
  await AccountDetails.tapEditAccountName();
  await EditAccountName.updateAccountName(newName);
  await EditAccountName.tapSave();
  await Assertions.expectTextDisplayed(newName);
};

describe(
  RegressionWalletPlatform('Multichain Accounts: Account Details'),
  () => {
    beforeEach(async () => {
      await TestHelpers.reverseServerPort();
    });

    it('renames the account', async () => {
      await withMultichainAccountDetailsEnabledFixtures(async () => {
        await goToAccountDetails(HD_ACCOUNT);
        await editName('Account 1-edited');
      });
    });

    it.skip('copies the account address', async () => {
      await checkAddress(HD_ACCOUNT.address);
    });

    it.skip('renames the wallet', async () => {
      // TODO: implement
    });
  },
);
