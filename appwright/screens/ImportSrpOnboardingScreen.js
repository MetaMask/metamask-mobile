import { CommonScreen } from './CommonScreen';
import { ImportFromSeedSelectorsIDs } from '../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import { expect } from 'appwright';

export class ImportSrpOnboardingScreen extends CommonScreen {
  get screenTitle() {
    return ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID;
  }

  get seedPhraseInput() {
    return ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID;
  }

  get continueButton() {
    return ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID;
  }

  async isScreenTitleVisible() {
    await this.isElementByIdVisible(this.screenTitle);
  }

  async typeSecretRecoveryPhrase(phrase) {
    await this.fillInput(this.seedPhraseInput, phrase);
  }

  async tapContinueButton() {
    await this.tapOnElement(this.continueButton);
  }

  async tapImportScreenTitleToDismissKeyboard() {
    await this.tapOnElement(this.screenTitle);
  }
}
