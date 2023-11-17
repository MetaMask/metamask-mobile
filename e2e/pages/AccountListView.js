import TestHelpers from '../helpers';

import {
  ACCOUNT_LIST_ID,
  ACCOUNT_LIST_ADD_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import { CommonSelectorsIDs } from '../selectors/Common.selectors';
import { AccountListViewSelectors } from '../selectors/AccountListView.selectors';

export default class AccountListView {
  static async tapNewAccount2() {
    await TestHelpers.tapItemAtIndex(CommonSelectorsIDs.CELLMULTISELECT, 1);
  }

  static async tapAddAccountButton() {
    await TestHelpers.waitAndTap(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  static async tapImportAccountButton() {
    await TestHelpers.tapByText(AccountListViewSelectors.IMPORT_ACCOUNT);
  }

  static async tapCreateAccountButton() {
    await TestHelpers.tapByText(AccountListViewSelectors.CREATE_ACCOUNT);
  }

  static async longPressImportedAccount() {
    await TestHelpers.tapAndLongPressAtIndex(CommonSelectorsIDs.CELLSELECT, 1);
  }
  static async swipeToDimssAccountsModal() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(ACCOUNT_LIST_ID, 'down', 'slow', 0.6);
    } else {
      await TestHelpers.swipeByText('Accounts', 'down', 'fast', 0.6);
    }
  }

  static async tapYesToRemoveImportedAccountAlertButton() {
    await TestHelpers.tapAlertWithButton(
      AccountListViewSelectors.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
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
