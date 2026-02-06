import { RegressionWalletPlatform } from '../../../e2e/tags';
import Assertions from '../../framework/Assertions';
import AccountDetails from '../../../e2e/pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../../e2e/pages/MultichainAccounts/EditAccountName';
import ShareAddress from '../../../e2e/pages/MultichainAccounts/ShareAddress';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import TestHelpers from '../../../e2e/helpers';

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
