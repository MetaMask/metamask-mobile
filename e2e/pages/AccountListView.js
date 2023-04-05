import TestHelpers from '../helpers';

import {
  ACCOUNT_LIST_ID,
  CREATE_ACCOUNT_BUTTON_ID,
  IMPORT_ACCOUNT_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import { CELL_SELECT_TEST_ID } from '../../app/component-library/components/Cells/Cell/variants/CellSelect/CellSelect.constants';

import { strings } from '../../locales/i18n';

const REMOVE_IMPORTED_ACCOUNT_TEXT = strings('accounts.yes_remove_it');

export default class AccountListView {
  static async tapCreateAccountButton() {
    await TestHelpers.waitAndTap(CREATE_ACCOUNT_BUTTON_ID);
  }

  static async tapImportAccountButton() {
    await TestHelpers.waitAndTap(IMPORT_ACCOUNT_BUTTON_ID);
  }

  static async tapAccountByName(accountName) {
    await TestHelpers.tapByText(accountName);
  }

  static async longPressImportedAccount() {
    await TestHelpers.tapAndLongPressAtIndex(CELL_SELECT_TEST_ID, 1);
  }

  static async swipeOnAccounts() {
    await TestHelpers.swipe(ACCOUNT_LIST_ID, 'down', 'slow', 0.6);
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

  static async isAccountNameVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
  }
  static async accountNameNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible('Account 2');
  }
}
