import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { SendViewSelectorsIDs } from '../../selectors/SendFlow/SendView.selectors';
import { AddAddressModalSelectorsIDs } from '../../selectors/SendFlow/AddAddressModal.selectors';

class SendView {
  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.SEND_CANCEL_BUTTON);
  }

  get addressInputField(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_INPUT);
  }

  get nextButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON)
      : Matchers.getElementByLabel(
          SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
        );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.SEND_BACK_BUTTON);
  }

  get addAddressButton(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADD_ADDRESS_BUTTON);
  }

  get sendAddressConfirmation(): DetoxElement {
    return Matchers.getElementByID(
      AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON,
    );
  }

  get removeAddressButton(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_REMOVE_BUTTON);
  }
  get contractWarning(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_ERROR);
  }

  get CurrentAccountElement(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.MY_ACCOUNT_ELEMENT);
  }

  get zeroBalanceWarning(): DetoxElement {
    return Matchers.getElementByID(SendViewSelectorsIDs.NO_ETH_MESSAGE);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Send View',
    });
  }

  async tapBackButton() {
    await Gestures.tapAtIndex(this.backButton, 0, {
      elemDescription: 'Back Button in Send View',
    });
  }

  async scrollToSavedAccount(): Promise<void> {
    await Gestures.swipe(this.CurrentAccountElement, 'up', {
      elemDescription: 'Scroll to Saved Account in Send View',
    });
  }

  async tapAddressInputField(): Promise<void> {
    await Gestures.waitAndTap(this.addressInputField, {
      elemDescription: 'Address Input Field in Send View',
    });
  }

  async tapAccountName(account: string): Promise<void> {
    const accountName = Matchers.getElementByText(account);
    await Gestures.waitAndTap(accountName, {
      elemDescription: `Account Name: ${account} in Send View`,
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button in Send View',
    });
  }

  async inputAddress(address: string): Promise<void> {
    await Gestures.replaceText(this.addressInputField, address, {
      elemDescription: 'Address Input Field in Send View',
    });
  }

  async tapAddAddressToAddressBook(): Promise<void> {
    await Gestures.waitAndTap(this.addAddressButton, {
      elemDescription: 'Add Address Button in Send View',
    });
  }

  async removeAddress(): Promise<void> {
    await Gestures.waitAndTap(this.removeAddressButton, {
      elemDescription: 'Remove Address Button in Send View',
    });
  }

  async splitAddressText(): Promise<string[]> {
    const attributes =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((await this.sendAddressConfirmation) as any).getAttributes();
    return await attributes.label.split(' ');
  }
}
export default new SendView();
