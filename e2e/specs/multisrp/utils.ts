import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions.ts';
import SRPListItemComponent from '../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import SrpQuizModal from '../../pages/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import { RevealSeedViewSelectorsText } from '../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails.ts';

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
