import { RegressionWalletPlatform } from '../../tags.js';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabledFixtures,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import Assertions from '../../framework/Assertions';
import ExportCredentials from '../../pages/MultichainAccounts/ExportCredentials';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultOptions } from '../../seeder/anvil-manager';
import TestHelpers from '../../helpers';

const PASSWORD = '123123123';

const checkCredentials = async () => {
  await Assertions.expectElementToBeVisible(
    RevealPrivateKey.revealCredentialQRCodeTab,
  );
  await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
  await Assertions.expectElementToBeVisible(
    RevealPrivateKey.revealCredentialQRCodeImage,
  );
  await RevealPrivateKey.scrollToDone();
  await RevealPrivateKey.tapDoneButton();
};

const exportPrivateKey = async () => {
  await AccountDetails.tapExportPrivateKeyButton();
  await ExportCredentials.enterPassword(PASSWORD);
  await RevealPrivateKey.tapToReveal();
  await checkCredentials();
};

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

    it('exports private key', async () => {
      await withMultichainAccountDetailsEnabledFixtures(async () => {
        await goToAccountDetails(HD_ACCOUNT);
        await exportPrivateKey();
      });
    });

    it('exports SRP', async () => {
      await withMultichainAccountDetailsEnabledFixtures(async () => {
        await goToAccountDetails(HD_ACCOUNT);
        await exportSrp();
      });
    });
  },
);
