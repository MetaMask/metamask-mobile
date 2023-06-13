import TestHelpers from '../helpers';

import { ACCOUNT_LIST_ID } from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import {
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from '../../app/constants/test-ids';

import messages from '../../locales/languages/en.json';

const REMOVE_IMPORTED_ACCOUNT_TEXT = messages.accounts.yes_remove_it;

export default class AccountListView {
  static async tapNewAccount2() {
    await TestHelpers.tapItemAtIndex(CELL_MULTI_SELECT_TEST_ID, 1);
  }

  static async longPressImportedAccount() {
    await TestHelpers.tapAndLongPressAtIndex(CELL_SELECT_TEST_ID, 1);
  }

  static async swipeToDimssAccountsModal() {
    await TestHelpers.swipeByText('Accounts', 'down', 'slow', 0.6);
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
