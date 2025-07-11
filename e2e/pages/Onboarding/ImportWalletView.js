import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import { ImportFromSeedSelectorsIDs } from '../../selectors/Onboarding/ImportFromSeed.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class ImportWalletView {
  get container() {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title() {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID,
    );
  }

  get newPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get seedPhraseInput() {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
    );
  }

  get continueButton() {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
    );
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.newPasswordInput, password);
  }

  async reEnterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.confirmPasswordInput, password);
  }

  async enterSecretRecoveryPhrase(secretRecoveryPhrase) {
    await Gestures.replaceText(
      this.seedPhraseInput,
      secretRecoveryPhrase,
      {
        elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
      }
    );
  }
  async clearSecretRecoveryPhraseInputBox() {
    await Gestures.clearField(this.seedPhraseInput,
      {
        elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
      }
    );
  }

  async tapContinueButton() {
    await Gestures.tap(this.continueButton, {
      elemDescription: 'Import Wallet Continue Button',
    });
  }

  async tapTitle() {
    await Gestures.tap(this.title, {
      elemDescription: 'Import Wallet Title',
    });
  }
}

export default new ImportWalletView();
