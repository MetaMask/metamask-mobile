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
import { PlatformDetector } from '../framework/PlatformLocator';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import PlaywrightAssertions from '../framework/PlaywrightAssertions';
import {
  asPlaywrightElement,
  EncapsulatedElementType,
} from '../framework/EncapsulatedElement';
import { AssertionOptions } from '../framework/types';

const PASSWORD = '123123123';

async function expectElementVisible(
  target: EncapsulatedElementType | DetoxElement,
  options: AssertionOptions = {},
): Promise<void> {
  if (FrameworkDetector.isAppium()) {
    await PlaywrightAssertions.expectElementToBeVisible(
      await asPlaywrightElement(target as EncapsulatedElementType),
      options,
    );
    return;
  }
  await Assertions.expectElementToBeVisible(target as DetoxElement, options);
}

async function expectTextVisible(
  text: string,
  options: AssertionOptions = {},
): Promise<void> {
  if (FrameworkDetector.isAppium()) {
    await PlaywrightAssertions.expectTextDisplayed(text, options);
    return;
  }
  await Assertions.expectTextDisplayed(text, options);
}

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

  // Check if already unlocked (biometrics) or need password entry
  let isAlreadyUnlocked = await RevealSecretRecoveryPhrase.isUnlocked();

  if (!isAlreadyUnlocked) {
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );
    // Re-check: "Done" on keyboard triggers tryUnlock() so app may already be on "Tap to reveal"
    isAlreadyUnlocked = await RevealSecretRecoveryPhrase.isUnlocked();
    if (!isAlreadyUnlocked) {
      await RevealSecretRecoveryPhrase.tapConfirmButton();
    }
  }

  // Tap the blur overlay to reveal the SRP
  await RevealSecretRecoveryPhrase.tapToReveal();
  await expectElementVisible(RevealSecretRecoveryPhrase.container);
  // SRP is now displayed in grid format - verify first word is displayed
  const srpWords = expectedSrp.split(' ');
  await expectTextVisible(srpWords[0]);
  await RevealSecretRecoveryPhrase.scrollToCopyToClipboardButton();

  await RevealSecretRecoveryPhrase.tapToRevealPrivateCredentialQRCode();

  if (PlatformDetector.isIOS()) {
    // For some reason, the QR code is visible on Android but detox cannot find it
    await expectElementVisible(
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
