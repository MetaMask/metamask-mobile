import Matchers from '../../../../utils/Matchers';
import {
  AddContactViewSelectorsIDs,
  AddContactViewSelectorsText,
} from '../../../../selectors/Settings/Contacts/AddContactView.selectors';
import Gestures from '../../../../utils/Gestures';
import DeleteAccountModal from './DeleteAccountModal';

class AddContactView {
  get container() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.CONTAINER);
  }

  get labelAddButton() {
    return Matchers.getElementByLabel(AddContactViewSelectorsIDs.ADD_BUTTON);
  }

  get addButton() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.ADD_BUTTON);
  }

  get labelEditButton() {
    return Matchers.getElementByLabel(AddContactViewSelectorsText.EDIT_BUTTON);
  }

  get editButton() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.EDIT_BUTTON);
  }

  get editContact() {
    return Matchers.getElementByText(AddContactViewSelectorsText.EDIT_CONTACT);
  }

  get deleteButton() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.DELETE_BUTTON);
  }

  get labelDeleteButton() {
    return Matchers.getElementByLabel(AddContactViewSelectorsIDs.DELETE_BUTTON);
  }

  get nameInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.NAME_INPUT);
  }

  get memoInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.MEMO_INPUT);
  }

  get addressInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.ADDRESS_INPUT);
  }

  async tapAddContactButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.labelAddButton);
    } else {
      await Gestures.waitAndTap(this.addButton);
    }
  }

  async tapEditButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.labelEditButton);
    } else {
      await Gestures.waitAndTap(this.editButton);
    }
  }

  async tapEditContactCTA() {
    await Gestures.waitAndTap(this.editContact); // edit CTA button after you make changes to a contact
  }

  async tapDeleteContactCTA() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.deleteButton);
      await DeleteAccountModal.tapDeleteButton();
    } else {
      await Gestures.waitAndTap(this.labelDeleteButton);
      await DeleteAccountModal.tapLabelDeleteButton();
    }
  }

  async typeInName(name) {
    await Gestures.replaceTextInField(this.nameInput, name);
  }

  async typeInMemo(memo) {
    await Gestures.replaceTextInField(this.memoInput, memo);
  }

  async typeInAddress(address) {
    await Gestures.replaceTextInField(this.addressInput, address);
  }

  async clearAddressInputBox() {
    await Gestures.clearField(this.addressInput);
  }
}

export default new AddContactView();
