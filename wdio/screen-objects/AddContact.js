import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  CONTACT_NAME_INPUT,
  CONTACT_ADD_BUTTON,
  CONTACT_ADDRESS_INPUT,
  CONTACTS_CONTAINER_ID,
} from './testIDs/Screens/Contacts.testids';

class Contacts {
  get contactInputfield() {
    return Selectors.getElementByPlatform(CONTACT_NAME_INPUT);
  }

  get addressInputField() {
    return Selectors.getElementByPlatform(CONTACT_ADDRESS_INPUT);
  }

  get addContactButton() {
    return Selectors.getElementByPlatform(CONTACT_ADD_BUTTON);
  }

  get contactOverviewNameInput() {
    return Selectors.getElementByPlatform(CONTACT_NAME_INPUT);
  }
  get contactScreenContainer() {
    return Selectors.getElementByPlatform(CONTACTS_CONTAINER_ID);
  }
  async isContactsScreenDisplayed() {
    await expect(this.contactScreenContainer).toBeDisplayed();
  }

  async isAddContactButtonEnabled() {
    await expect(this.addContactButton).toBeEnabled();
  }

  async tapOnAddContactButton() {
    await Gestures.tap(this.addContactButton);
    await Gestures.tap(this.addContactButton);
  }

  async fillContactNamefield(name) {
    await Gestures.typeText(this.contactInputfield, name);
  }

  async fillAddressField(address) {
    await Gestures.typeText(this.addressInputField, address);
  }

  async tapOnText(text) {
    await Gestures.tapTextByXpath(text);
  }

  async changeContactName(newName) {
    await Gestures.typeText(this.contactOverviewNameInput, newName);
  }
}
export default new Contacts();
