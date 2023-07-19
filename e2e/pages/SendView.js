import TestHelpers from '../helpers';
import {
  ADDRESS_BOOK_NEXT_BUTTON,
  ADDRESS_ERROR,
  NO_ETH_MESSAGE,
} from '../../app/constants/test-ids';
import {
  ADD_ADDRESS_BUTTON,
  SEND_ADDRESS_INPUT_FIELD,
  SEND_CANCEL_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';

const MY_ACCOUNT_ELEMENT_ID = 'my-account-element';
const REMOVE_ADDRESS_BUTTON_ID = 'clear-address-button';

export default class SendView {
  static async tapCancelButton() {
    await TestHelpers.tap(SEND_CANCEL_BUTTON);
  }

  static async tapNextButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(ADDRESS_BOOK_NEXT_BUTTON);
    } else {
      await TestHelpers.waitAndTapByLabel(ADDRESS_BOOK_NEXT_BUTTON);
    }
  }
  static async inputAddress(address) {
    await TestHelpers.replaceTextInField(SEND_ADDRESS_INPUT_FIELD, address);
  }

  static async tapAndLongPress() {
    await TestHelpers.tapAndLongPress(SEND_ADDRESS_INPUT_FIELD);
  }
  static async tapAddAddressToAddressBook() {
    await TestHelpers.waitAndTap(ADD_ADDRESS_BUTTON);
  }

  static async removeAddress() {
    // Tap x to remove address
    await TestHelpers.tap(REMOVE_ADDRESS_BUTTON_ID);
    await TestHelpers.delay(1000);
  }

  // Assertions

  static async isMyAccountsVisisble() {
    await TestHelpers.checkIfExists(MY_ACCOUNT_ELEMENT_ID);
  }

  static async incorrectAddressErrorMessageIsVisible() {
    await TestHelpers.checkIfVisible(ADDRESS_ERROR);
  }

  static async noEthWarningMessageIsVisible() {
    //Check that the warning appears at the bottom of the screen
    await TestHelpers.checkIfVisible(NO_ETH_MESSAGE);
  }

  static async isSavedAliasVisible(name) {
    await TestHelpers.checkIfElementWithTextIsVisible(name);
  }
  static async isSavedAliasIsNotVisible(name) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(name);
  }
}
