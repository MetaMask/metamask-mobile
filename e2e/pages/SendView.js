import TestHelpers from '../helpers';
import {
  ADD_ADDRESS_BUTTON,
  SEND_ADDRESS_INPUT_FIELD,
  SEND_CANCEL_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';
import { SendViewSelectorsIDs } from '../selectors/SendView.selectors';

export default class SendView {
  static async tapCancelButton() {
    await TestHelpers.tap(SEND_CANCEL_BUTTON);
  }

  static async tapNextButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(
        SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
      );
    } else {
      await TestHelpers.waitAndTapByLabel(
        SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
      );
    }
  }
  static async inputAddress(address) {
    await TestHelpers.replaceTextInField(SEND_ADDRESS_INPUT_FIELD, address);
  }

  static async tapAddAddressToAddressBook() {
    await TestHelpers.waitAndTap(ADD_ADDRESS_BUTTON);
  }

  static async removeAddress() {
    // Tap x to remove address
    await TestHelpers.tap(SendViewSelectorsIDs.ADDRESS_REMOVE_BUTTON);
    await TestHelpers.delay(1000);
  }

  // Assertions

  static async isMyAccountsVisible() {
    await TestHelpers.checkIfExists(SendViewSelectorsIDs.MY_ACCOUNT_ELEMENT);
  }

  static async incorrectAddressErrorMessageIsVisible() {
    await TestHelpers.checkIfVisible(SendViewSelectorsIDs.ADDRESS_ERROR);
  }

  static async noEthWarningMessageIsVisible() {
    //Check that the warning appears at the bottom of the screen
    await TestHelpers.checkIfVisible(SendViewSelectorsIDs.NO_ETH_MESSAGE);
  }

  static async isSavedAliasVisible(name) {
    await TestHelpers.checkIfElementWithTextIsVisible(name);
  }
  static async isSavedAliasIsNotVisible(name) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(name);
  }
}
