import { CommonScreen } from './CommonScreen';
import { ImportFromSeedSelectorsIDs } from '../../e2e/selectors/ImportAccount/ImportAccountFromPrivateKey.selectorss';


export class ImportAccountScreen extends CommonScreen {
  get seedPhraseInput() {
    return ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID;
  }

  get closeButton() {
    return ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON;
  }

  get continueButton() {
    return ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID;
  }

  async isScreenTitleVisible() {
    await this.isElementByIdVisible(this.screenTitle);
  }

  async inputOfIndex(srpIndex) {
   return `import-from-seed-screen-seed-phrase-input-id_${String(srpIndex)}`;
  }

  async typeSecretRecoveryPhrase(phrase) {
    const phraseArray = phrase.split(' ');
    const firstWord = phraseArray[0];
    const lastWord = phraseArray[phraseArray.length - 1];
    await this.fillInput(this.seedPhraseInput, `${firstWord} `);
    for (let i = 1; i < phraseArray.length - 1; i++) {
      await this.fillInput(await this.inputOfIndex(i), `${phraseArray[i]} `);
    }
    await this.fillInput(await this.inputOfIndex(phraseArray.length - 1), lastWord);
  }

  async tapContinueButton() {
    await this.tapOnElement(this.continueButton);
  }

  async tapImportScreenTitleToDismissKeyboard() {
    await this.tapOnElement(this.screenTitle);
  }
}
