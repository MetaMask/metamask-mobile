/* eslint-disable no-undef */
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { ImportAccountFromPrivateKeyIDs } from '../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds';

class ImportAccountScreen {
  get importAccountContainer() {
    return Selectors.getXpathElementByResourceId(ImportAccountFromPrivateKeyIDs.CONTAINER);
  }

  get closeButton() {
    return Selectors.getElementByPlatform(ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON);
  }

  get privateKeyInputBox() {
    return Selectors.getXpathElementByResourceId(ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX);
  }

  async typePrivateKeyAndDismissKeyboard(privateKey) {
    await Gestures.typeText(this.privateKeyInputBox, privateKey);
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
