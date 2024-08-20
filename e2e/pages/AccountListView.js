import { CellModalSelectorsIDs } from '../selectors/Modals/CellModal.selectors';
import {
  AccountListViewSelectorsIDs,
  AccountListViewSelectorsText,
} from '../selectors/AccountListView.selectors';
import { ConnectAccountModalSelectorsIDs } from '../selectors/Modals/ConnectAccountModal.selectors';
import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class AccountListView {
  get accountList() {
    return Matchers.getElementByID(AccountListViewSelectorsIDs.ACCOUNT_LIST_ID);
  }

  get accountTypeLabel() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get addAccountButton() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get removeAccountAlertText() {
    return Matchers.getElementByText(
      AccountListViewSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  get connectAccountsButton() {
    return Matchers.getElementByID(
      ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  getAccountElementAtIndex(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.BASE_TITLE, index);
  }

  getSelectElement(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.SELECT, index);
  }
  getMultiselectElement(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.MULTISELECT, index);
  }

  async tapAccountIndex(index) {
    await Gestures.tap(this.getMultiselectElement(index));
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async longPressImportedAccount() {
    await Gestures.tapAndLongPress(this.getSelectElement(1));
  }

  async swipeToDismissAccountsModal() {
    await Gestures.swipe(this.accountList, 'down', 'fast', 0.6);
  }

  async tapYesToRemoveImportedAccountAlertButton() {
    await Gestures.waitAndTap(this.removeAccountAlertText);
  }

  async tapConnectAccountsButton() {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }
}

export default new AccountListView();
