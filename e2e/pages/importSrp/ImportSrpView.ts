import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ImportSRPIDs } from '../../selectors/MultiSRP/SRPImport.selectors';

class ImportSrpView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get importButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON)
      : Matchers.getElementByLabel(ImportSRPIDs.IMPORT_BUTTON);
  }

  get textareaInput(): DetoxElement {
    return Matchers.getElementByID(ImportSRPIDs.PASTE_BUTTON);
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
    } else {
      // For Android, we use replaceText to avoid autocomplete issue
      await Gestures.replaceText(this.textareaInput, mnemonic, {
        elemDescription,
      });
    }
  }
}

export default new ImportSrpView();
