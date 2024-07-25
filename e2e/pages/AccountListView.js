import TestHelpers from '../helpers';

import {
  ACCOUNT_LIST_ID,
  ACCOUNT_LIST_ADD_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import { CellModalSelectorsIDs } from '../selectors/Modals/CellModal.selectors';
import {
  AccountListViewSelectorsIDs,
  AccountListViewSelectorsText,
} from '../selectors/AccountListView.selectors';
import { ConnectAccountModalSelectorsIDs } from '../selectors/Modals/ConnectAccountModal.selectors';
import Matchers from '../utils/Matchers';

export default class AccountListView {
  get accountTypeLabel() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get accountName() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_NAME_LABEL,
    );
  }

  static async tapAccountIndex(index) {
    await TestHelpers.tapItemAtIndex(CellModalSelectorsIDs.MULTISELECT, index);
  }

  static async tapAddAccountButton() {
    await TestHelpers.waitAndTap(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  static async tapImportAccountButton() {
    await TestHelpers.tapByText(AccountListViewSelectorsText.IMPORT_ACCOUNT);
  }

  static async tapCreateAccountButton() {
    await TestHelpers.tapByText(AccountListViewSelectorsText.CREATE_ACCOUNT);
  }

  static async longPressImportedAccount() {
    await TestHelpers.tapAndLongPressAtIndex(CellModalSelectorsIDs.SELECT, 1);
  }

  static async longPressImportedAccountThree() {
    await TestHelpers.tapAndLongPressAtIndex(CellModalSelectorsIDs.SELECT, 2);
  }

  static async swipeToDimssAccountsModal() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(ACCOUNT_LIST_ID, 'down', 'fast', 0.6);
    } else {
      await TestHelpers.swipeByText('Accounts', 'down', 'fast', 0.6);
    }
  }

  static async tapYesToRemoveImportedAccountAlertButton() {
    await TestHelpers.tapAlertWithButton(
      AccountListViewSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
  }

  static async isAccount2VisibleAtIndex(index) {
    await expect(
      element(by.id(CellModalSelectorsIDs.BASE_TITLE)).atIndex(index),
    ).not.toHaveText('Account 1');
  }

  static async accountNameNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible('Account 2');
  }

  static async checkAccountVisibilityAtIndex(index, shouldBeVisible) {
    const expectation = element(
      by.id(CellModalSelectorsIDs.BASE_TITLE),
    ).atIndex(index);

    const expectedText = `Account ${index + 1}`;

    try {
      if (shouldBeVisible) {
        await expect(expectation).toHaveText(expectedText);
      } else {
        await expect(expectation).not.toHaveText(expectedText);
      }
    } catch (error) {
      if (shouldBeVisible) {
        throw new Error(
          `Expected element at index ${index} to be visible, but it does not exist.`,
        );
      } else {
        // If the element should not be visible and it doesn't exist, the test passes.
        return;
      }
    }
  }

  static async connectAccountsButton() {
    await TestHelpers.waitAndTap(
      ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }
}
