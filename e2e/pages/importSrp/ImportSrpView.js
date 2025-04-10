import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { ImportSRPIDs } from '../../selectors/MultiSRP/SRPImport.selectors';

class ImportSrpView {
  get container() {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get importButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON)
      : Matchers.getElementByLabel(ImportSRPIDs.IMPORT_BUTTON);
  }

  get clearButton() {
    return Matchers.getElementByID(ImportSRPIDs.CLEAR_BUTTON);
  }

  get dropdown() {
    return Matchers.getElementByID(ImportSRPIDs.SRP_SELECTION_DROPDOWN);
  }

  inputOfIndex(srpIndex) {
    return Matchers.getElementByID(
      ImportSRPIDs.SRP_INPUT_WORD_NUMBER + `-${srpIndex}`,
    );
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async enterSrpWord(srpIndex, word) {
    await Gestures.typeTextAndHideKeyboard(this.inputOfIndex(srpIndex), word);
  }

  async selectNWordSrp(numberOfWords) {
    await Gestures.waitAndTap(this.dropdown);
    await Gestures.waitAndTap(
      Matchers.getElementByLabel(`I have a ${numberOfWords} word phrase`),
    );
  }
}

export default new ImportSrpView();
