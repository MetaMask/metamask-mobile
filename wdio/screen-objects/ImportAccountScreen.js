/* eslint-disable no-undef */
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  IMPORT_PRIVATE_KEY_BUTTON_ID,
  PRIVATE_KEY_INPUT_BOX_ID,
  IMPORT_ACCOUNT_SCREEN_ID,
  CLOSE_BUTTON_ON_IMPORT_ACCOUNT_SCREEN_ID,
} from './testIDs/Screens/ImportAccountScreen.testIds';

class ImportAccountScreen {
  get importAccountContainer() {
    return Selectors.getElementByPlatform(IMPORT_ACCOUNT_SCREEN_ID);
  }
  get importButton() {
    return Selectors.getElementByPlatform(IMPORT_PRIVATE_KEY_BUTTON_ID);
  }
  get closeButton() {
    return Selectors.getElementByPlatform(
      CLOSE_BUTTON_ON_IMPORT_ACCOUNT_SCREEN_ID,
    );
  }
  get privateKeyInputBox() {
    return Selectors.getElementByPlatform(PRIVATE_KEY_INPUT_BOX_ID);
  }

  async typePrivateKeyAndDismissKeyboard(privateKey) {
    await Gestures.typeText(this.privateKeyInputBox, privateKey);
    await driver.pause(2500);
  }

  async tapImportButton() {
    await Gestures.tapTextByXpath('Import Account'); // TO DISMISS KEYBOARD
    await Gestures.tapTextByXpath('IMPORT'); // NEARLY IMPOSSIBLE TO TAP BY ID. HAVE TO USE TEXT
  }
  async isAlertTextVisible(text) {
    // This needs to be in a helpers file. It is also used in
    // the ImportAccountScreen class
    const message = await driver.getAlertText();
    try {
      expect(message.includes(text.trim())).toBe(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Not able to get device alert text: `);
    }
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
  async isVisible() {
    await expect(this.importAccountContainer).toBeDisplayed();
  }
}

export default new ImportAccountScreen();
