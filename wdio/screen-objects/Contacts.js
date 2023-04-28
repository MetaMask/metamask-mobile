import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  CONTACT_ADD_BUTTON,
  CONTACTS_CONTAINER_ID,
} from './testIDs/Screens/Contacts.testids';

class Contacts {
  get container() {
    return Selectors.getElementByPlatform(CONTACTS_CONTAINER_ID);
  }

  get addContactButton() {
    return Selectors.getElementByPlatform(CONTACT_ADD_BUTTON);
  }

  async waitForDisplayed() {
    const screen = await this.container;
    await screen.waitForDisplayed();
  }

  async tapAddContactButton() {
    const addContactButton = await this.addContactButton;
    await addContactButton.waitForDisplayed();
    let isDisplayed = await addContactButton.isDisplayed();

    while (isDisplayed) {
      await addContactButton.click();
      await driver.pause(2000);
      isDisplayed = await addContactButton.isDisplayed();
    }
  }

  async tapOnText(text) {
    await Gestures.tapTextByXpath(text);
  }
}

export default new Contacts();
