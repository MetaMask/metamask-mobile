import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
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
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
    });
  }

  async enterSrp(mnemonic: string): Promise<void> {
    await Gestures.replaceText(this.seedPhraseInput(0), mnemonic, {
      elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
      timeout: 15_000,
    });
  }
}

export default new ImportSrpView();
