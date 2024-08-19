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
import Gestures from '../utils/Gestures';

class AccountListView {
  get accountList() {
    return Matchers.getElementByID(ACCOUNT_LIST_ID);
  }

  get accountTypeLabel() {
    return Matchers.getElementByID(
      AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get addAccountButton() {
    return Matchers.getElementByID(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  getMultiselectElement(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.MULTISELECT, index);
  }

  get importAccountButton() {
    return Matchers.getElementByText(
      AccountListViewSelectorsText.IMPORT_ACCOUNT,
    );
  }

  get createAccountButton() {
    return Matchers.getElementByText(
      AccountListViewSelectorsText.CREATE_ACCOUNT,
    );
  }

  getSelectElement(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.SELECT, index);
  }

  get connectAccountsButton() {
    return Matchers.getElementByID(
      ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  getAccountElementAtIndex(index) {
    return Matchers.getElementByID(CellModalSelectorsIDs.BASE_TITLE, index);
  }

  async tapAccountIndex(index) {
    await Gestures.tap(this.getMultiselectElement(index));
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapImportAccountButton() {
    await Gestures.tap(this.importAccountButton);
  }

  async tapCreateAccountButton() {
    await Gestures.tap(this.createAccountButton);
  }

  async longPressImportedAccount() {
    await Gestures.tapAndLongPress(this.getSelectElement(1));
  }

  async swipeToDismissAccountsModal() {
    const element =
      device.getPlatform() === 'android'
        ? await this.accountList
        : await Matchers.getElementByText('Accounts');
    await Gestures.swipe(element, 'down', 'fast', 0.6);
  }

  async tapYesToRemoveImportedAccountAlertButton() {
    await Gestures.tap(
      Matchers.getElementByText(
        AccountListViewSelectorsText.REMOVE_IMPORTED_ACCOUNT,
      ),
    );
  }

  async tapConnectAccountsButton() {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }
}

export default new AccountListView();
