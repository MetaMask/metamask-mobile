import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { ENTER_ALIAS_INPUT_BOX_ID } from '../testIDs/Screens/AddressBook.testids';
import { ADD_ADDRESS_MODAL_CONTAINER_ID } from '../../../app/constants/test-ids';

class AddressBookModal {
  get container() {
    return Selectors.getElementByPlatform(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }

  get addressInputField() {
    return Selectors.getElementByPlatform(ENTER_ALIAS_INPUT_BOX_ID);
  }

  async waitForDisplayed() {
    const container = await this.container;
    await container.waitForDisplayed();
  }

  async fillAddressAliasField(text) {
    await Gestures.typeText(this.addressInputField, text);
  }

  async isCancelButtonEnabled() {
    expect(await Selectors.getXpathElementByText('Cancel')).toBeEnabled();
  }

  async isSaveButtonEnabled() {
    expect(await Selectors.getXpathElementByText('Save')).toBeEnabled();
  }

  async tapOnSaveButton() {
    await Gestures.tap(await Selectors.getXpathElementByText('Save'));
  }

  async isContactNameVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).toBeDisplayed();
  }

  async isDeletedContactNameNotVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).not.toBeDisplayed();
  }
}

export default new AddressBookModal();
