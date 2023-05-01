import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID,
  IMPORT_SUCESS_SCREEN_ID,
} from './testIDs/Screens/ImportSuccessScreen.testIds';

class ImportAccountScreen {
  get container() {
    return Selectors.getElementByPlatform(IMPORT_SUCESS_SCREEN_ID);
  }

  get closeButton() {
    return Selectors.getElementByPlatform(IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID);
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
