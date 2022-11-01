import TestHelpers from '../helpers';
import { ADDRESS_BOOK_NEXT_BUTTON } from '../../app/constants/test-ids';

const ADDRESS_INPUT_BOX_ID = 'txn-to-address-input';
const ADD_TO_ADDRESS_BOOK_BUTTON_ID = 'add-address-button';
const CANCEL_BUTTON_ID = 'send-cancel-button';
const INCORRECT_ADDRESS_ERROR_ID = 'address-error';
const NO_ETH_WARNING_MESSAGE_ID = 'no-eth-message';
const MY_ACCOUNTS_BUTTON_ID = 'my-accounts-button';
const REMOVE_ADDRESS_BUTTON_ID = 'clear-address-button';

export default class SendView {
  static async tapcancelButton() {
    await TestHelpers.tap(CANCEL_BUTTON_ID);
  }

  static async tapNextButton() {
    await TestHelpers.waitAndTap(ADDRESS_BOOK_NEXT_BUTTON);
  }
  static async inputAddress(address) {
    await TestHelpers.replaceTextInField(ADDRESS_INPUT_BOX_ID, address);
  }

  static async tapAndLongPress() {
    await TestHelpers.tapAndLongPress(ADDRESS_INPUT_BOX_ID);
  }
  static async tapAddAddressToAddressBook() {
    await TestHelpers.waitAndTap(ADD_TO_ADDRESS_BOOK_BUTTON_ID);
  }

  static async removeAddress() {
    // Tap x to remove address
    await TestHelpers.tap(REMOVE_ADDRESS_BUTTON_ID);
    await TestHelpers.delay(1000);
  }

  // Assertions

  static async isTransferBetweenMyAccountsButtonVisible() {
    await TestHelpers.checkIfExists(MY_ACCOUNTS_BUTTON_ID);
  }

  static async incorrectAddressErrorMessageIsVisible() {
    await TestHelpers.checkIfVisible(INCORRECT_ADDRESS_ERROR_ID);
  }

  static async noEthWarningMessageIsVisible() {
    //Check that the warning appears at the bottom of the screen
    await TestHelpers.checkIfVisible(NO_ETH_WARNING_MESSAGE_ID);
  }

  static async isSavedAliasVisible(name) {
    await TestHelpers.checkIfElementWithTextIsVisible(name);
  }
  static async isSavedAliasIsNotVisible(name) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(name);
  }
}
