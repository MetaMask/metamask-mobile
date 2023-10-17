import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  ADD_CONTACT_ADD_BUTTON,
  ADD_CONTACT_ADDRESS_INPUT,
  ADD_CONTACT_DELETE_BUTTON,
  ADD_CONTACT_NAME_INPUT,
  ADD_CONTACTS_CONTAINER_ID,
} from './testIDs/Screens/AddContact.testIds';
import { EDIT_BUTTON } from './testIDs/Common.testIds';

class AddContacts {
  get container() {
    return Selectors.getElementByPlatform(ADD_CONTACTS_CONTAINER_ID);
  }

  get contactInputField() {
    return Selectors.getElementByPlatform(ADD_CONTACT_NAME_INPUT);
  }

  get addressInputField() {
    return Selectors.getElementByPlatform(ADD_CONTACT_ADDRESS_INPUT);
  }

  get addContactButton() {
    return Selectors.getElementByPlatform(ADD_CONTACT_ADD_BUTTON);
  }

  get deleteButton() {
    return Selectors.getElementByPlatform(ADD_CONTACT_DELETE_BUTTON);
  }

  get editButton() {
    return Selectors.getElementByPlatform(EDIT_BUTTON);
  }

  async waitForDisplay() {
    const element = await this.container;
    await element.waitForDisplayed();
  }

  async tapAddContactButton() {
    await Gestures.waitAndTap(this.addContactButton);
    await Gestures.waitAndTap(this.addContactButton);
  }

  async waitForAddContactButton() {
    const element = await this.addContactButton;
    await element.waitForDisplayed();
  }

  async fillContactNameField(name) {
    await Gestures.typeText(this.contactInputField, name);
    await driver.hideKeyboard();
  }

  async fillAddressField(address) {
    await Gestures.typeText(this.addressInputField, address);
    await driver.hideKeyboard();
  }

  async tapEditButton() {
    await Gestures.waitAndTap(this.editButton);
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteButton);
  }
}

export default new AddContacts();
