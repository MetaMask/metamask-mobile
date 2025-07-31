import { AccountListBottomSheetSelectorsIDs } from '../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { CommonScreen } from '../screens/CommonScreen';

export class AccountListComponent extends CommonScreen {
  get accountListContainer() {
    return AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID;
  }

  get addAccountButton() {
    return AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID;
  }

  async tapOnAddAccountButton() {
    await this.tapOnElement(this.addAccountButton);
  }

  async isComponentDisplayed() {
    await this.isElementByIdVisible(this.accountListContainer);
  }
}
