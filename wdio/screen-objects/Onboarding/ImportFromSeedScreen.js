import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ImportFromSeedSelectorsIDs } from '../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect } from 'appwright';

class ImportFromSeedScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get screenTitle() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID,
      );
    } else {
      return AppwrightSelectors.getElementByResourceId(this._device, ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
    }
  }

  get seedPhraseInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
    } else {
      return AppwrightSelectors.getElementByResourceId(this._device, ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID);
    }
  }

  get continueButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID);
    } else {
      return AppwrightSelectors.getElementByResourceId(this._device, ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID);
    }
  }


  async inputOfIndex(srpIndex) {
    return `import-from-seed-screen-seed-phrase-input-id_${String(srpIndex)}`;
   }
 

  async isScreenTitleVisible() {
    if (!this._device) {
      await expect(this.screenTitle).toBeDisplayed();
    } else {
      const element = await this.screenTitle;
      await expect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async typeSecretRecoveryPhrase(phrase) {
    if (!this._device) {
      await Gestures.setValueWithoutTap(this.seedPhraseInput, phrase);
    } else {
      const phraseArray = phrase.split(' ');
      const firstWord = phraseArray[0];
      const lastWord = phraseArray[phraseArray.length - 1];
      const form = await this.seedPhraseInput
      await form.fill(`${firstWord} `);
      for (let i = 1; i < phraseArray.length - 1; i++) {
        const wordElement = await this.inputOfIndex(i);
        const input = await this.device.getById(wordElement);
        await input.fill(`${phraseArray[i]} `);
      }
      const wordElement = await this.inputOfIndex(phraseArray.length - 1);
      const lastInput = await this.device.getById(wordElement);
      await lastInput.fill(lastWord);
    }
  }

  async tapContinueButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.continueButton);
    } else {
      const element = await this.continueButton;
      await element.tap();
    }
  }

  async tapImportScreenTitleToDismissKeyboard() {
    if (!this._device) {
      await Gestures.waitAndTap(this.screenTitle);
    } else {
      const element = await this.screenTitle;
      await element.tap();
    }
  }
}

export default new ImportFromSeedScreen();
