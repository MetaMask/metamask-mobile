import Matchers from '../../../utils/Matchers';
import {
  AddContactViewSelectorsIDs,
  AddContactViewSelectorsText,
} from '../../../selectors/Settings/Contacts/AddContactView.selectors';
import Gestures from '../../../utils/Gestures';

class AddContactView {
  get container() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.CONTAINER);
  }

  get addButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.ADD_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsIDs.ADD_BUTTON);
  }

  get editButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.EDIT_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsText.EDIT_BUTTON);
  }

  get editContact() {
    return Matchers.getElementByText(AddContactViewSelectorsText.EDIT_CONTACT);
  }

  get deleteButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.DELETE_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsIDs.DELETE_BUTTON);
  }

  get nameInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.NAME_INPUT);
  }

  get memoLabel() {
    return Matchers.getElementByText(AddContactViewSelectorsText.MEMO);
  }

  get memoInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.MEMO_INPUT);
  }

  get addressInput() {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.ADDRESS_INPUT);
  }

  async tapAddContactButton() {
    await Gestures.waitAndTap(this.addButton);
  }

  async tapEditButton() {
    await Gestures.waitAndTap(this.editButton);
  }

  async tapEditContactCTA() {
    await Gestures.waitAndTap(this.editContact); // edit CTA button after you make changes to a contact
  }

  async tapDeleteContactCTA() {
    await Gestures.waitAndTap(this.deleteButton);
  }

  async typeInName(name) {
    await Gestures.replaceTextInField(this.nameInput, name);
    await Gestures.waitAndTap(this.memoLabel); // tap somewhere to dismiss keyboard
  }

  async typeInMemo(memo) {
    await Gestures.replaceTextInField(this.memoInput, memo);
    await Gestures.waitAndTap(this.memoLabel); // tap somewhere to dismiss keyboard
  }

  async typeInAddress(address) {
    await Gestures.replaceTextInField(this.addressInput, address);
    await Gestures.waitAndTap(this.memoLabel); // tap somewhere to dismiss keyboard
  }

  async clearAddressInputBox() {
    await Gestures.clearField(this.addressInput);
  }

  async selectNetwork(networkName) {
    const networkSelector = Matchers.getElementByID(
      AddContactViewSelectorsIDs.NETWORK_INPUT,
    );
    await Gestures.waitAndTap(networkSelector);
    const networkOption = Matchers.getElementByText(networkName);
    await Gestures.waitAndTap(networkOption);
  }
}

export default new AddContactView();
