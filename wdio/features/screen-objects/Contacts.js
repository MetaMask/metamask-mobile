import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  CONTACT_NAME_INPUT,
  CONTACT_ADD_BUTTON,
  CONTACT_ADDRESS_INPUT,
  CONTACT_EDIT_BUTTON,
} from '../testIDs/Screens/Contacts.testids';

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

  get editButton() {
    return Selectors.getElementByPlatform(CONTACT_EDIT_BUTTON);
  }

  get contactOverviewNameInput() {
    return Selectors.getElementByPlatform(CONTACT_NAME_INPUT);
  }

  async isContactsScreenDisplayed() {
    await expect(await this.addContactButton).toBeDisplayed();
  }

  async isAddContactButtonEnabled() {
    await expect(await this.addContactButton).toBeEnabled();
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

  async tapOnEditButton() {
    await Gestures.tap(this.editButton);
  }
  async changeContactName(newName) {
    await Gestures.typeText(this.contactOverviewNameInput, newName);
  }
}
export default new Contacts();
