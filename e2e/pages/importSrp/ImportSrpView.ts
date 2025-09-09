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
  async enterSrpWord(srpIndex: number, word: string): Promise<void> {
    const inputElement = this.inputOfIndex(srpIndex);
    const elemDescription = `SRP word input at index ${srpIndex}`;

    if (device.getPlatform() === 'ios') {
      await Gestures.typeText(inputElement, word, {
        elemDescription,
        hideKeyboard: true,
      });
    } else {
      // For Android, we use replaceText to avoid autocomplete issue
      await Gestures.replaceText(inputElement, word, {
        elemDescription,
      });
    }
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
