import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ImportFromSeedSelectorsIDs } from '../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect as appwrightExpect, ScrollDirection } from 'appwright';

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
      return AppwrightSelectors.getElementByID(this._device, ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
    }
  }

  get seedPhraseInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByID(this._device, ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID);
      } else {
        return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeOther[@name="textfield"]');
      }
    }
  }

  get continueButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID);
    }
  }


  async inputOfIndex(srpIndex, onboarding = true) {
    if (onboarding) {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return `import-from-seed-screen-seed-phrase-input-id_${String(srpIndex)}`;
      } else {
        return `//XCUIElementTypeOther[@name="textfield" and @label="${String(srpIndex)}."]`;
        
      }
    }
    else {
      return `srp-input-word-${String(srpIndex)}`;
    }
   }
 

  async isScreenTitleVisible(onboarding = true) {
    if (!this._device) {
      await expect(this.screenTitle).toBeDisplayed();
    } else {
      if (onboarding) {
        const element = await this.screenTitle;
        await appwrightExpect(element).toBeVisible({ timeout: 10000 });
      } else {
        const element = await AppwrightSelectors.getElementByText(this.device, 'Import Secret Recovery Phrase');
        await appwrightExpect(element).toBeVisible({ timeout: 10000 });
      }
    }
  }

  async typeSecretRecoveryPhrase(phrase, onboarding = true) {
    const phraseArray = phrase.split(' ');
    if (!this._device) {
      await Gestures.setValueWithoutTap(this.seedPhraseInput, phrase);
    } else {
      if (onboarding) {
        const firstWord = phraseArray[0];
        const lastWord = phraseArray[phraseArray.length - 1];
        const form = await this.seedPhraseInput
        await form.fill(`${firstWord} `);
        for (let i = 1; i < phraseArray.length - 1; i++) {
          let index = i;  
          if (AppwrightSelectors.isIOS(this._device)) { // SRP fields on iOS starts from 1
            index = i + 1;
          }
          
          const wordElement = await this.inputOfIndex(index);
          let input;
          if (AppwrightSelectors.isAndroid(this._device))
            input = await AppwrightSelectors.getElementByID(this.device, wordElement);
          else
            input = await AppwrightSelectors.getElementByXpath(this.device, wordElement);
          await input.fill(`${phraseArray[i]} `);
        }
        const wordElement = await this.inputOfIndex(AppwrightSelectors.isAndroid(this._device) ? phraseArray.length - 1 : phraseArray.length);
        const lastInput = AppwrightSelectors.isAndroid(this._device) ? await AppwrightSelectors.getElementByID(this.device, wordElement) : await AppwrightSelectors.getElementByXpath(this.device, wordElement);
        await lastInput.fill(lastWord);
      } else {
        for (let i = 1; i <= phraseArray.length; i++) {
          const wordElement = await this.inputOfIndex(i, false);
          const input = await AppwrightSelectors.getElementByID(this.device, wordElement);
          await input.fill(`${phraseArray[i-1]} `);
        }
      }
    }
  }

  async tapContinueButton(onboarding = true) {
    if (onboarding) {
      if (!this._device) {
        await Gestures.waitAndTap(this.continueButton);
      } else {
        const element = await this.continueButton;
        await AppwrightSelectors.hideKeyboard(this.device);
        await element.tap();
      }
    } else {
      if (!this._device) {
        await Gestures.waitAndTap(this.continueButton);
      } else {
        const isIOS = await AppwrightSelectors.isIOS(this.device);
        if (isIOS) {
          const element = await AppwrightSelectors.getElementByID(this.device, 'import-button');
          await element.tap();
        } else {
          const element = await AppwrightSelectors.getElementByText(this.device, 'Continue');
          await element.tap();
        }
      }
    }
  }

  async tapImportScreenTitleToDismissKeyboard(onboarding = true) {
    if (onboarding) {
      if (!this._device) {
          await Gestures.waitAndTap(this.screenTitle);
      } else {
        const element = await this.screenTitle;
        await element.tap();
      }
    } else {
      if (!this._device) {
        await Gestures.waitAndTap(this.screenTitle);
    } else {
      const element = await AppwrightSelectors.getElementByText(this.device, 'Import Secret Recovery Phrase');
      await element.tap();
    }
    }
  }
}

export default new ImportFromSeedScreen();
