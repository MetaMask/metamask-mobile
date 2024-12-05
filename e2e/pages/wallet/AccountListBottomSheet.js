import { CellComponentSelectorsIDs } from '../../selectors/wallet/CellComponent.selectors';
import {
  AccountListBottomSheetSelectorsIDs,
  AccountListBottomSheetSelectorsText,
} from '../../selectors/wallet/AccountListBottomSheet.selectors';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../selectors/Browser/ConnectAccountBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

class AccountListBottomSheet {
  get accountList() {
    return Matchers.getElementByID(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID);
  }

  get accountTypeLabel() {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get accountTagLabel() {
    return Matchers.getElementByID(CellComponentSelectorsIDs.TAG_LABEL);
  }

  get title() {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
    );
  }

  get addAccountButton() {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get removeAccountAlertText() {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  get connectAccountsButton() {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  async getAccountElementByAccountName(accountName) {
    return Matchers.getElementByIDAndLabel(
      CellComponentSelectorsIDs.BASE_TITLE,
      accountName,
    );
  }

  getSelectElement(index) {
    return Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, index);
  }

  getMultiselectElement(index) {
    return Matchers.getElementByID(CellComponentSelectorsIDs.MULTISELECT, index);
  }

  getSelectWithMenuElement(index) {
    return Matchers.getElementByID(
      CellComponentSelectorsIDs.SELECT_WITH_MENU,
      index,
    );
  }

  async tapEditAccountActionsAtIndex(index) {
    const accountActionsButton = Matchers.getElementByID(
      `${WalletViewSelectorsIDs.ACCOUNT_ACTIONS}-${index}`,
    );
    await Gestures.waitAndTap(accountActionsButton);
  }

  async accountNameInList(accountName) {
    return Matchers.getElementByText(accountName, 1);
  }
  async tapAccountIndex(index) {
    await Gestures.tap(this.getMultiselectElement(index));
  }

  async tapToSelectActiveAccountAtIndex(index) {
    await Gestures.tap(this.getSelectWithMenuElement(index));
  }

  async longPressAccountAtIndex(index) {
    await Gestures.tapAndLongPress(this.getSelectWithMenuElement(index));
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async longPressImportedAccount() {
    await Gestures.tapAndLongPress(this.getSelectElement(1));
  }

  async swipeToDismissAccountsModal() {
    await Gestures.swipe(this.title, 'down', 'fast', 0.6);
    await TestHelpers.delay(2000);
  }

  async tapYesToRemoveImportedAccountAlertButton() {
    await Gestures.waitAndTap(this.removeAccountAlertText);
  }

  async tapConnectAccountsButton() {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }
}

export default new AccountListBottomSheet();
