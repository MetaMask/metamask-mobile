import { RegressionWalletPlatform } from '../../tags.js';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import { completeSrpQuiz } from '../../flows/accounts.flow';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import { defaultOptions } from '../../seeder/anvil-manager';
import TestHelpers from '../../helpers';

const exportSrp = async () => {
  await AccountDetails.tapExportSrpButton();
  await completeSrpQuiz(defaultOptions.mnemonic);
};

describe(
  RegressionWalletPlatform('Multichain Accounts: Account Details'),
  () => {
    beforeEach(async () => {
      await TestHelpers.reverseServerPort();
    });

    it('exports SRP', async () => {
      await withMultichainAccountDetailsEnabledFixtures(async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await goToAccountDetails(HD_ACCOUNT);
        await exportSrp();
      });
    });
  },
);
