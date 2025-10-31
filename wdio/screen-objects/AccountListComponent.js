import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AccountListBottomSheetSelectorsIDs,
} from '../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect } from 'appwright';

class AccountListComponent {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get accountListContainer() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID);
    } else {
      return AppwrightSelectors.getElementByText(this._device, 'Accounts');
    }
  }

  get addAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID);
    } else {
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Add account');
    }
  }

  get addWalletButton() {
    return AppwrightSelectors.getElementByID(this._device, 'account-list-add-account-button');
  }

  async tapCreateAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.addAccountButton);
    } else {
      await AppwrightGestures.tap(this.addAccountButton); // Use static tapElement method with retry logic
    }
  }

  async tapOnAddWalletButton() {
    const element = await this.addWalletButton;
    await AppwrightGestures.tap(element); // Use static tap method with retry logic
  }

  async isComponentDisplayed() {
    if (!this._device) {
      await this.accountListContainer.waitForDisplayed();
    } else {
      const element = await this.accountListContainer;
      await expect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async isComponentNotDisplayed() {
    const element = await this.accountListContainer;
    await element.waitForExist({ reverse: true });
  }

  async isAccountDisplayed(name) {
    const element = await AppwrightSelectors.getElementByCatchAll(this.device, name);
    await expect(element).toBeVisible({ timeout: 10000 });
  }

  async tapOnAccountByName(name) {
    let account = await AppwrightSelectors.getElementByText(this.device, name);
    await AppwrightGestures.scrollIntoView(this.device, account); // Use inherited method with retry logic
    await AppwrightGestures.tap(account); // Tap after scrolling into view
  }
}

export default new AccountListComponent();