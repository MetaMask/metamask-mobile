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

  get dropdown(): DetoxElement {
    return Matchers.getElementByID(ImportSRPIDs.SRP_SELECTION_DROPDOWN);
  }

  inputOfIndex(srpIndex: number): DetoxElement {
    return Matchers.getElementByID(
      ImportSRPIDs.SRP_INPUT_WORD_NUMBER + `-${String(srpIndex)}`,
    );
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
    });
  }

  async enterSrpWord(srpIndex: number, word: string) {
    // Using replaceText to avoid autocomplete from device
    await Gestures.replaceText(this.inputOfIndex(srpIndex), word, {
      elemDescription: `SRP word input at index ${srpIndex}`,
    });
  }

  async selectNWordSrp(numberOfWords: number) {
    await Gestures.waitAndTap(this.dropdown);
    await Gestures.waitAndTap(
      Matchers.getElementByLabel(
        `I have a ${String(numberOfWords)} word phrase`,
      ),
    );
  }
}

export default new ImportSrpView();
