import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions.ts';
import SRPListItemComponent from '../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import SrpQuizModal from '../../pages/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
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
  const mnemonicArray = mnemonic.split(' ');
  const numberOfWords = mnemonicArray.length;

  if (numberOfWords === 24) {
    await ImportSrpView.selectNWordSrp(numberOfWords);
  }

  for (const [index, word] of mnemonicArray.entries()) {
    await ImportSrpView.enterSrpWord(index + 1, word);
  }
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
