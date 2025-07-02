import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ImportFromSeedSelectorsIDs } from '../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';

class ImportFromSeedScreen {
  get screenTitle() {
    return Selectors.getXpathElementByResourceId(
      ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID,
    );
  }

  get seedPhraseInput() {
    return Selectors.getXpathElementByResourceId(
      ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
    );
  }

  get continueButton() {
    return Selectors.getXpathElementByResourceId(ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID);
  }

  async isScreenTitleVisible() {
    await expect(this.screenTitle).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase(phrase) {
    await Gestures.setValueWithoutTap(this.seedPhraseInput, phrase);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }

  async tapImportScreenTitleToDismissKeyboard() {
    await Gestures.waitAndTap(this.screenTitle);
  }
}

export default new ImportFromSeedScreen();
