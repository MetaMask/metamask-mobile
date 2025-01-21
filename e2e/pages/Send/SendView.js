import TestHelpers from '../../helpers';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import { SendViewSelectorsIDs } from '../../selectors/SendFlow/SendView.selectors';
import {AddAddressModalSelectorsIDs} from '../../selectors/SendFlow/AddAddressModal.selectors'
import Assertions from '../../utils/Assertions';


class SendView {
  get cancelButton() {
    return Matchers.getElementByID(SendViewSelectorsIDs.SEND_CANCEL_BUTTON);
  }

  get addressInputField() {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_INPUT);
  }

  get nextButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON)
      : Matchers.getElementByLabel(
          SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
        );
  }

  get backButton() {
    return Matchers.getElementByID(SendViewSelectorsIDs.SEND_BACK_BUTTON);
  }

  get addAddressButton() {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADD_ADDRESS_BUTTON);
  }

  get sendAddressConfirmation() {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON);
  }

  get removeAddressButton() {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_REMOVE_BUTTON);
  }
  get contractWarning() {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_ERROR);
  }

  get CurrentAccountElement() {
    return Matchers.getElementByID(SendViewSelectorsIDs.MY_ACCOUNT_ELEMENT);
  }

  get zeroBalanceWarning() {
    return Matchers.getElementByID(SendViewSelectorsIDs.NO_ETH_MESSAGE);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapBackButton() {
    await Gestures.TapAtIndex(this.backButton, 0);
  }

  async scrollToSavedAccount() {
    await Gestures.swipe(this.CurrentAccountElement, 'up');
  }

  async tapAddressInputField() {
    await Gestures.waitAndTap(this.addressInputField);
  }

  async tapAccountName(account) {
    const accountName = Matchers.getElementByText(account);
    await Gestures.waitAndTap(accountName);
  }

  async tapNextButton() {
    await Gestures.waitAndTap(this.nextButton);
  }

  async inputAddress(address) {
    await Gestures.replaceTextInField(this.addressInputField, address);
  }

  async tapAddAddressToAddressBook() {
    await Gestures.waitAndTap(this.addAddressButton);
  }

  async removeAddress() {
    await Gestures.waitAndTap(this.removeAddressButton);
    await TestHelpers.delay(1000);
  }

  async splitAddressText(){
    const attributes = await (await this.sendAddressConfirmation).getAttributes();
    return await attributes.label.split(' ');
  }
}
export default new SendView();
