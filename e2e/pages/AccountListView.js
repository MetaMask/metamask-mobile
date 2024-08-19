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
    const element = await this.getMultiselectElement(index);
    await Gestures.tap(element);
  }

  async tapAddAccountButton() {
    const element = await this.addAccountButton;
    await Gestures.waitAndTap(element);
  }

  async tapImportAccountButton() {
    const element = await this.importAccountButton;
    await Gestures.tap(element);
  }

  async tapCreateAccountButton() {
    const element = await this.createAccountButton;
    await Gestures.tap(element);
  }

  async longPressImportedAccount() {
    const element = await this.getSelectElement(1);
    await Gestures.tapAndLongPress(element);
  }

  async swipeToDismissAccountsModal() {
    const element =
      device.getPlatform() === 'android'
        ? await Matchers.getElementByID(ACCOUNT_LIST_ID)
        : await Matchers.getElementByText('Accounts');
    await Gestures.swipe(element, 'down', 'fast', 0.6);
  }

  async tapYesToRemoveImportedAccountAlertButton() {
    const element = await Matchers.getElementByText(
      AccountListViewSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
    await Gestures.tap(element);
  }

  async isVisible() {
    const element = await Matchers.getElementByID(ACCOUNT_LIST_ID);
    return Matchers.checkIfVisible(element);
  }

  async tapConnectAccountsButton() {
    const element = await this.connectAccountsButton;
    await Gestures.waitAndTap(element);
  }
}

export default new AccountListView();
