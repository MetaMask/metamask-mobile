import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import { ImportFromSeedSelectorsIDs } from '../../selectors/Onboarding/ImportFromSeed.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class ImportWalletView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
  }

  get newPasswordInput(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get seedPhraseInput(): DetoxElement {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
    );
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
    );
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, password, {
      hideKeyboard: true,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, password, {
      hideKeyboard: true,
    });
  }

  async enterSecretRecoveryPhrase(secretRecoveryPhrase: string): Promise<void> {
    await Gestures.replaceText(this.seedPhraseInput, secretRecoveryPhrase, {
      elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
    });
  }
  async clearSecretRecoveryPhraseInputBox(): Promise<void> {
    await Gestures.typeText(this.seedPhraseInput, '', {
      elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
      clearFirst: true,
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.tap(this.continueButton, {
      elemDescription: 'Import Wallet Continue Button',
    });
  }

  async tapTitle(): Promise<void> {
    await Gestures.tap(this.title, {
      elemDescription: 'Import Wallet Title',
    });
  }
}

export default new ImportWalletView();
