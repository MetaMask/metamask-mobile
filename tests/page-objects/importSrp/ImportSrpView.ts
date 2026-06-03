import Matchers from '../../framework/Matchers';
import { ImportSRPIDs } from '../../../app/components/Views/ImportNewSecretRecoveryPhrase/SRPImport.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ImportSrpView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ImportSRPIDs.CONTAINER),
      appium: () => PlaywrightMatchers.getElementById(ImportSRPIDs.CONTAINER),
    });
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ImportSRPIDs.SCREEN_TITLE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(ImportSRPIDs.SCREEN_TITLE_ID),
    });
  }

  get importButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(ImportSRPIDs.IMPORT_BUTTON),
    });
  }

  get textareaInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(ImportSRPIDs.SEED_PHRASE_INPUT_ID),
    });
  }

  seedPhraseInput(index: number): DetoxElement {
    if (index !== 0) {
      return Matchers.getElementByID(
        `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      );
    }
    return Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
  }

  async tapTitle() {
    await UnifiedGestures.tap(this.title, {
      elemDescription: 'Import SRP screen title',
    });
  }

  async tapImportButton() {
    await UnifiedGestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
    });
  }

  async enterSrp(mnemonic: string): Promise<void> {
    if (device.getPlatform() === 'ios') {
      const srpArray = mnemonic.split(' ');
      for (const [i, word] of srpArray.entries()) {
        await UnifiedGestures.typeText(this.seedPhraseInput(i), `${word} `, {
          elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
          hideKeyboard: i === srpArray.length - 1,
        });
      }
      await this.tapTitle();
    } else {
      await UnifiedGestures.replaceText(this.textareaInput, mnemonic, {
        elemDescription: 'SRP textarea input',
        checkVisibility: false,
      });
    }
  }
}

export default new ImportSrpView();
