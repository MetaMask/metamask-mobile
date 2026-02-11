import ImportSrpView from '../page-objects/importSrp/ImportSrpView';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../page-objects/wallet/AddAccountBottomSheet';
import WalletView from '../page-objects/wallet/WalletView';
import Assertions from '../framework/Assertions';
import SRPListItemComponent from '../page-objects/wallet/MultiSrp/Common/SRPListItemComponent';
import SrpQuizModal from '../page-objects/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../page-objects/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import SettingsView from '../page-objects/Settings/SettingsView';
import SecurityAndPrivacyView from '../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AccountDetails from '../page-objects/MultichainAccounts/AccountDetails';

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

  // Check if already unlocked via biometrics or need password entry
  const isAlreadyUnlocked = await RevealSecretRecoveryPhrase.isUnlocked();

  if (!isAlreadyUnlocked) {
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );
    // Tap confirm button to unlock and show the tab view with blur overlay
    await RevealSecretRecoveryPhrase.tapConfirmButton();
  }

  // Tap the blur overlay to reveal the SRP
  await RevealSecretRecoveryPhrase.tapToReveal();
  await Assertions.expectElementToBeVisible(
    RevealSecretRecoveryPhrase.container,
  );
  // SRP is now displayed in grid format - verify first word is displayed
  const srpWords = expectedSrp.split(' ');
  await Assertions.expectTextDisplayed(srpWords[0]);
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
  await AccountDetails.tapAccountSrpLink();
};

export const startExportForKeyring = async (keyringId: string) => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapSecurityAndPrivacy();
  await SecurityAndPrivacyView.tapRevealSecretRecoveryPhraseButton();
  await SRPListItemComponent.tapListItem(keyringId);
};
