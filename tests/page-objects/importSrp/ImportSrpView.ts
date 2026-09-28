import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { ImportSRPIDs } from '../../../app/components/Views/ImportNewSecretRecoveryPhrase/SRPImport.testIds';

class ImportSrpView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportSRPIDs.SCREEN_TITLE_ID);
  }

  get importButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON);
  }

  get textareaInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
  }

  seedPhraseInput(index: number): Promise<AppiumElement> {
    const testID =
      index === 0
        ? ImportSRPIDs.SEED_PHRASE_INPUT_ID
        : `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${index}`;

    return Matchers.getElementByID(testID);
  }

  async tapTitle() {
    await Gestures.tap(this.title, {
      elemDescription: 'Import SRP screen title',
    });
  }

  async tapImportButton() {
    if (!PlatformDetector.isAndroid()) {
      await Gestures.hideKeyboard();
    }
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
      timeout: 15_000,
      checkForDisplayed: true,
      checkEnabled: true,
    });
  }

  async enterSrp(mnemonic: string): Promise<void> {
    if (PlatformDetector.isAndroid()) {
      await Gestures.replaceText(this.seedPhraseInput(0), mnemonic, {
        elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
        timeout: 15_000,
      });
      return;
    }

    // iOS: enter word-by-word. After the first word+space the UI switches from
    // TextArea to numbered grid chips (`seed-phrase-input_${index}`).
    const srpArray = mnemonic.split(' ');
    await Gestures.typeTextByCharacters(
      this.seedPhraseInput(0),
      `${srpArray[0]} `,
    );
    for (const [i, word] of srpArray.entries()) {
      if (i === 0) {
        continue;
      }
      const suffix = i === srpArray.length - 1 ? '' : ' ';
      const isLast = i === srpArray.length - 1;
      await Gestures.typeText(this.seedPhraseInput(i), `${word}${suffix}`, {
        elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
        hideKeyboard: isLast,
      });
    }
  }
}

export default new ImportSrpView();
