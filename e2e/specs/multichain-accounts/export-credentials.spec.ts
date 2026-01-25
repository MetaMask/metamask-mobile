import { RegressionWalletPlatform } from '../../tags.js';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultOptions } from '../../../tests/seeder/anvil-manager';
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
        await goToAccountDetails(HD_ACCOUNT);
        await exportSrp();
      });
    });
  },
);
