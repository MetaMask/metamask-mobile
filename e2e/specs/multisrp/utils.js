import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../utils/Assertions';
import SRPListItemComponent from '../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import SrpQuizModal from '../../pages/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

const PASSWORD = '123123123';

export const goToImportSrp = async () => {
  await WalletView.tapIdenticon();
  await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapImportSrp();
  await Assertions.checkIfVisible(ImportSrpView.container);
};

export const inputSrp = async (mnemonic) => {
  const mnemonicArray = mnemonic.split(' ');
  const numberOfWords = mnemonicArray.length;

  if (numberOfWords === 24) {
    await ImportSrpView.selectNWordSrp(numberOfWords);
  }

  for (const [index, word] of mnemonicArray.entries()) {
    await ImportSrpView.enterSrpWord(index + 1, word);
  }
};

export const completeSrpQuiz = async (expectedSrp) => {
  await SrpQuizModal.tapGetStartedButton();
  await SrpQuizModal.tapQuestionRightAnswerButton(1);
  await SrpQuizModal.tapQuestionContinueButton(1);
  await SrpQuizModal.tapQuestionRightAnswerButton(2);
  await SrpQuizModal.tapQuestionContinueButton(2);
  await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
    PASSWORD,
  );
  await RevealSecretRecoveryPhrase.tapToReveal();
  await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
  await Assertions.checkIfTextIsDisplayed(
    RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_SRP_TITLE_TEXT,
  );
  await Assertions.checkIfTextIsDisplayed(expectedSrp);
  await RevealSecretRecoveryPhrase.tapDoneButton();
};

export const goToAccountActions = async (accountIndex) => {
  await WalletView.tapIdenticon();
  await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(accountIndex);
  await AccountActionsBottomSheet.tapShowSRP();
};

export const startExportForKeyring = async (keyringId) => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapSecurityAndPrivacy();
  await SecurityAndPrivacyView.tapRevealSecretRecoveryPhraseButton();
  await SRPListItemComponent.tapListItem(keyringId);
};
