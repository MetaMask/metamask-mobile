import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
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

  seedPhraseInput(index: number): EncapsulatedElementType {
    if (index !== 0) {
      return Matchers.getElementByID(
        `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      );
    }
    return Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
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
    if (device.getPlatform() === 'ios') {
      const srpArray = mnemonic.split(' ');
      for (const [i, word] of srpArray.entries()) {
        await Gestures.typeText(this.seedPhraseInput(i), `${word} `, {
          elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
          hideKeyboard: i === srpArray.length - 1,
        });
      }
      await this.tapTitle();
    } else {
      await Gestures.replaceText(this.textareaInput, mnemonic, {
        elemDescription: 'SRP textarea input',
        checkVisibility: false,
      });
    }
  }
}

export default new ImportSrpView();
