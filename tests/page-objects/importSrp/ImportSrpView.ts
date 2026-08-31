import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { resolve } from '../../framework/Selector';
import { ImportSRPIDs } from '../../../app/components/Views/ImportNewSecretRecoveryPhrase/SRPImport.testIds';

class ImportSrpView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.SCREEN_TITLE_ID);
  }

  get importButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON);
  }

  get textareaInput(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
  }

  private getAppiumIosSeedPhraseXPath(index: number): string {
    if (index === 0) {
      return '//XCUIElementTypeOther[@name="textfield"]';
    }

    return `//XCUIElementTypeOther[@name="textfield" and @label="${index + 1}."]`;
  }

  seedPhraseInput(index: number): EncapsulatedElementType {
    const testID =
      index === 0
        ? ImportSRPIDs.SEED_PHRASE_INPUT_ID
        : `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${index}`;

    return resolve({
      detoxTestID: testID,
      androidAppiumTestID: testID,
      iosAppiumXPath: this.getAppiumIosSeedPhraseXPath(index),
    });
  }

  async tapTitle() {
    await Gestures.tap(this.title, {
      elemDescription: 'Import SRP screen title',
    });
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
    });
  }

  async enterSrp(mnemonic: string): Promise<void> {
    const srpArray = mnemonic.split(' ');

    if (PlatformDetector.isAndroid()) {
      await Gestures.replaceText(this.seedPhraseInput(0), mnemonic, {
        elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
      });
      return;
    }

    for (const [i, word] of srpArray.entries()) {
      const suffix = i === srpArray.length - 1 ? '' : ' ';
      const isLast = i === srpArray.length - 1;
      await Gestures.typeText(this.seedPhraseInput(i), `${word}${suffix}`, {
        elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
        hideKeyboard: isLast,
        checkForDisplayed: true,
      });
    }
  }
}

export default new ImportSrpView();
