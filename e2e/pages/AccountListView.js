import TestHelpers from '../helpers';

import {
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from '../../app/constants/test-ids';
import {
  ACCOUNT_LIST_ID,
  ACCOUNT_LIST_ADD_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

import messages from '../../locales/languages/en.json';

const REMOVE_IMPORTED_ACCOUNT_TEXT = messages.accounts.yes_remove_it;
const IMPORT_ACCOUNT_TEXT = messages.account_actions.import_account;
const CREATE_ACCOUNT_TEXT = messages.account_actions.add_new_account;

export default class AccountListView {
  static async tapNewAccount2() {
    await TestHelpers.tapItemAtIndex(CELL_MULTI_SELECT_TEST_ID, 1);
  }

  static async tapAddAccountButton() {
    await TestHelpers.waitAndTap(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  static async tapImportAccountButton() {
    await TestHelpers.tapByText(IMPORT_ACCOUNT_TEXT);
  }

  static async tapCreateAccountButton() {
    await TestHelpers.tapByText(CREATE_ACCOUNT_TEXT);
  }

  static async longPressImportedAccount() {
    await TestHelpers.tapAndLongPressAtIndex(CELL_SELECT_TEST_ID, 1);
  }
  static async swipeToDimssAccountsModal() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(ACCOUNT_LIST_ID, 'down', 'slow', 0.6);
    } else {
      await TestHelpers.swipeByText('Accounts', 'down', 'fast', 0.6);
    }
  }

  static async tapYesToRemoveImportedAccountAlertButton() {
    await TestHelpers.tapAlertWithButton(REMOVE_IMPORTED_ACCOUNT_TEXT);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ACCOUNT_LIST_ID);
  }

  static async isNewAccountNameVisible() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
    }
  }

  static async accountNameNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible('Account 2');
  }
}
