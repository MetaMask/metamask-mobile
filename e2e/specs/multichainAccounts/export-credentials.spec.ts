'use strict';
import { SmokeWalletPlatform } from '../../tags';
import {
  HD_ACCOUNT,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import Assertions from '../../utils/Assertions';
import ExportCredentials from '../../pages/MultichainAccounts/ExportCredentials';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView.js';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultOptions } from '../../seeder/anvil-manager';

const PASSWORD = '123123123';

const checkCredentials = async () => {
  await Assertions.checkIfVisible(
    RevealPrivateKey.revealCredentialCopyToClipboardButton,
  );
  await RevealPrivateKey.tapToCopyCredentialToClipboard();
  await Assertions.checkIfVisible(RevealPrivateKey.revealCredentialQRCodeTab);
  await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
  await Assertions.checkIfVisible(RevealPrivateKey.revealCredentialQRCodeImage);
  await RevealPrivateKey.tapDoneButton();
};

const exportPrivateKey = async () => {
  await AccountDetails.tapExportPrivateKeyButton();
  await ExportCredentials.enterPassword(PASSWORD);
  await RevealPrivateKey.tapToReveal();
  await checkCredentials();
};

const exportSrp = async () => {
  await AccountDetails.tapExportSRPButton();
  await Assertions.checkIfVisible(ExportCredentials.srpInfoContainer);
  await ExportCredentials.tapNextButton();
  // this also checks the srp
  await completeSrpQuiz(defaultOptions.mnemonic);
};

describe(SmokeWalletPlatform('Multichain Accounts: Account Details'), () => {
  it('exports private key', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await goToAccountDetails(HD_ACCOUNT);
      await exportPrivateKey();
    });
  });

  it('exports SRP', async () => {
    await withMultichainAccountDetailsEnabled(async () => {
      await goToAccountDetails(HD_ACCOUNT);
      await exportSrp();
    });
  });
});
