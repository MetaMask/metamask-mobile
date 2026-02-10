import { RegressionWalletPlatform } from '../../../e2e/tags.js';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from '../../helpers/multichain-accounts/common';
import AccountDetails from '../../../e2e/pages/MultichainAccounts/AccountDetails';
import { completeSrpQuiz } from '../../flows/accounts.flow';
import { defaultOptions } from '../../seeder/anvil-manager';
import TestHelpers from '../../../e2e/helpers';

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
        await goToAccountDetails(HD_ACCOUNT);
        await exportSrp();
      });
    });
  },
);
