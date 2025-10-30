import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ImportSRPIDs } from '../../selectors/MultiSRP/SRPImport.selectors';

class ImportSrpView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(ImportSRPIDs.SCREEN_TITLE_ID);
  }

  get importButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON)
      : Matchers.getElementByLabel(ImportSRPIDs.IMPORT_BUTTON);
  }

  get textareaInput(): DetoxElement {
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
    const elemDescription = 'SRP textarea input';

    if (device.getPlatform() === 'ios') {
      await Gestures.typeText(this.textareaInput, mnemonic, {
        elemDescription,
        hideKeyboard: true,
      });
      await this.tapTitle();
    } else {
      await Gestures.replaceText(this.textareaInput, mnemonic, {
        elemDescription,
        checkVisibility: false,
      });
    }
  }
}

export default new ImportSrpView();
