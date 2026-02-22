import ImportSrpView from '../../e2e/pages/importSrp/ImportSrpView.ts';
import AccountListBottomSheet from '../../e2e/pages/wallet/AccountListBottomSheet.ts';
import AddAccountBottomSheet from '../../e2e/pages/wallet/AddAccountBottomSheet.ts';
import WalletView from '../../e2e/pages/wallet/WalletView.ts';
import Assertions from '../framework/Assertions.ts';
import SRPListItemComponent from '../../e2e/pages/wallet/MultiSrp/Common/SRPListItemComponent.ts';
import SrpQuizModal from '../../e2e/pages/Settings/SecurityAndPrivacy/SrpQuizModal.ts';
import RevealSecretRecoveryPhrase from '../../e2e/pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.ts';
import { RevealSeedViewSelectorsText } from '../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds.ts';
import TabBarComponent from '../../e2e/pages/wallet/TabBarComponent.ts';
import SettingsView from '../../e2e/pages/Settings/SettingsView.ts';
import SecurityAndPrivacyView from '../../e2e/pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.ts';
import AccountDetails from '../../e2e/pages/MultichainAccounts/AccountDetails.ts';

const PASSWORD = '123123123';

export const goToImportSrp = async () => {
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapImportSrp();
  await Assertions.expectElementToBeVisible(ImportSrpView.container);
};

export const inputSrp = async (mnemonic: string) => {
  await ImportSrpView.enterSrp(mnemonic);
};

export const completeSrpQuiz = async (expectedSrp: string) => {
  await SrpQuizModal.tapGetStartedButton();
  await SrpQuizModal.tapQuestionRightAnswerButton(1);
  await SrpQuizModal.tapQuestionContinueButton(1);
  await SrpQuizModal.tapQuestionRightAnswerButton(2);
  await SrpQuizModal.tapQuestionContinueButton(2);
  await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
    PASSWORD,
  );
  await RevealSecretRecoveryPhrase.tapToReveal();
  await Assertions.expectElementToBeVisible(
    RevealSecretRecoveryPhrase.container,
  );
  await Assertions.expectTextDisplayed(
    RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_SRP_TITLE_TEXT,
  );
  await Assertions.expectTextDisplayed(expectedSrp);
  await RevealSecretRecoveryPhrase.scrollToCopyToClipboardButton();

  await RevealSecretRecoveryPhrase.tapToRevealPrivateCredentialQRCode();

  if (device.getPlatform() === 'ios') {
    // For some reason, the QR code is visible on Android but detox cannot find it
    await Assertions.expectElementToBeVisible(
      RevealSecretRecoveryPhrase.revealCredentialQRCodeImage,
    );
  }

  await RevealSecretRecoveryPhrase.scrollToDone();
  await RevealSecretRecoveryPhrase.tapDoneButton();
};

export const goToAccountActions = async (accountIndex: number) => {
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(accountIndex);
  await AccountDetails.tapExportSrpButton();
};

export const startExportForKeyring = async (keyringId: string) => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapSecurityAndPrivacy();
  await SecurityAndPrivacyView.tapRevealSecretRecoveryPhraseButton();
  await SRPListItemComponent.tapListItem(keyringId);
};
