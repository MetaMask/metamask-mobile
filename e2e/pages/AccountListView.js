import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';

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

export default class AccountListView {
  get accountTypeLabel() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get addAccountButton() {
    return Matchers.getElementByID(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  getAccountElementAtIndex(index) {
    return element(by.id(CellModalSelectorsIDs.BASE_TITLE)).atIndex(index);
  }

  async tapAccountIndex(index) {
    await Gestures.tapItemAtIndex(CellModalSelectorsIDs.MULTISELECT, index);
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapImportAccountButton() {
    await Gestures.tapByText(AccountListViewSelectorsText.IMPORT_ACCOUNT);
  }

  async tapCreateAccountButton() {
    await Gestures.tapByText(AccountListViewSelectorsText.CREATE_ACCOUNT);
  }

  async longPressImportedAccount() {
    await Gestures.tapAndLongPressAtIndex(CellModalSelectorsIDs.SELECT, 1);
  }

  async swipeToDismissAccountsModal() {
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(ACCOUNT_LIST_ID, 'down', 'fast', 0.6);
    } else {
      await Gestures.swipeByText('Accounts', 'down', 'fast', 0.6);
    }
  }

  async tapYesToRemoveImportedAccountAlertButton() {
    await Gestures.tapAlertWithButton(
      AccountListViewSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  async isVisible() {
    await Matchers.checkIfVisible(ACCOUNT_LIST_ID);
  }

  async isAccount2VisibleAtIndex(index) {
    await expect(this.getAccountElementAtIndex(index)).not.toHaveText(
      'Account 1',
    );
  }

  async accountNameNotVisible() {
    await Matchers.checkIfElementWithTextIsNotVisible('Account 2');
  }

  async checkAccountVisibilityAtIndex(index, shouldBeVisible) {
    const expectedAccountElement = this.getAccountElementAtIndex(index);
    const expectedAccountNameText = `Account ${index + 1}`;

    try {
      if (shouldBeVisible) {
        await expect(expectedAccountElement).toHaveText(
          expectedAccountNameText,
        );
      } else {
        await expect(expectedAccountElement).not.toHaveText(
          expectedAccountNameText,
        );
      }
    } catch (error) {
      this.handleVisibilityError(shouldBeVisible, index);
    }
  }

  handleVisibilityError(shouldBeVisible, index) {
    if (shouldBeVisible) {
      throw new Error(
        `Expected element at index ${index} to be visible, but it does not exist.`,
      );
    }
  }

  async connectAccountsButton() {
    await Gestures.waitAndTap(
      ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }
}
