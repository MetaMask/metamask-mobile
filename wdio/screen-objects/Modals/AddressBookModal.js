import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  ADDRESS_ALIAS_SAVE_BUTTON_ID,
  ADDRESS_ALIAS_TITLE_ID,
  ENTER_ALIAS_INPUT_BOX_ID
} from '../testIDs/Screens/AddressBook.testids';
import { ADD_ADDRESS_MODAL_CONTAINER_ID } from '../../../app/constants/test-ids';

class AddressBookModal {
  get container() {
    return Selectors.getElementByPlatform(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }

  get addressInputField() {
    return Selectors.getElementByPlatform(ENTER_ALIAS_INPUT_BOX_ID);
  }

  get saveButton() {
    return Selectors.getElementByPlatform(ADDRESS_ALIAS_SAVE_BUTTON_ID);
  }

  get cancelButton() {
    return Selectors.getElementByPlatform(ADDRESS_ALIAS_SAVE_BUTTON_ID);
  }

  get title() {
    return Selectors.getElementByPlatform(ADDRESS_ALIAS_TITLE_ID);
  }

  async waitForDisplayed() {
    const container = await this.container;
    await container.waitForDisplayed();
  }

  async fillAddressAliasField(text) {
    await Gestures.typeText(this.addressInputField, text);
  }

  async isCancelButtonEnabled() {
    expect(this.cancelButton).toBeEnabled();
  }

  async isSaveButtonEnabled() {
    expect(this.saveButton).toBeEnabled();
  }

  async tapOnSaveButton() {
    await Gestures.waitAndTap(this.saveButton);
  }

  async tapTitle() {
    await Gestures.waitAndTap(this.title);
  }

  async isContactNameVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).toBeDisplayed();
  }

  async isDeletedContactNameNotVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).not.toBeDisplayed();
  }
}

export default new AddressBookModal();
