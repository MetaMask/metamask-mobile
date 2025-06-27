import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { ImportSRPIDs } from '../../e2e/selectors/MultiSRP/SRPImport.selectors';

class ImportSrpView {
  get container() {
    return Selectors.getXpathElementByResourceId(ImportSRPIDs.CONTAINER);
  }

  get importButton() {
      return Selectors.getXpathElementByResourceId(ImportSRPIDs.IMPORT_BUTTON)
  }

  get clearButton() {
    return Selectors.getXpathElementByResourceId(ImportSRPIDs.CLEAR_BUTTON);
  }

  get dropdown() {
    return Selectors.getXpathElementByResourceId(ImportSRPIDs.SRP_SELECTION_DROPDOWN);
  }

  inputOfIndex(srpIndex) {
    return Selectors.getXpathElementByResourceId(
      ImportSRPIDs.SRP_INPUT_WORD_NUMBER + `-${srpIndex}`,
    );
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async enterSrpWord(srpIndex, word) {
    await Gestures.typeText(this.inputOfIndex(srpIndex), word);
  }

  async selectNWordSrp(numberOfWords) {
    await Gestures.waitAndTap(this.dropdown);
    await Gestures.waitAndTap(
      Selectors.getXpathByContentDesc(`I have a ${numberOfWords} word phrase`),
    );
  }
}

export default new ImportSrpView();
