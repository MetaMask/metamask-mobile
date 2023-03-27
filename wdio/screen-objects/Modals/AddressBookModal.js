import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { ENTER_ALIAS_INPUT_BOX_ID } from '../testIDs/Screens/AddressBook.testids';

class AddressBookModal {
  get addressInputField() {
    return Selectors.getElementByPlatform(ENTER_ALIAS_INPUT_BOX_ID);
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
