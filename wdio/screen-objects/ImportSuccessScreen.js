import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { SuccessImportAccountIDs } from '../../e2e/selectors/ImportAccount/SuccessImportAccount.selectors';

class ImportAccountScreen {
  get container() {
    return Selectors.getXpathElementByResourceId(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton() {
    return Selectors.getXpathElementByResourceId(SuccessImportAccountIDs.CLOSE_BUTTON);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }

  async isVisible() {
    const importSuccessScreen = await this.container;
    await importSuccessScreen.waitForDisplayed();
  }
}

export default new ImportAccountScreen();
