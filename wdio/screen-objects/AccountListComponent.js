import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AccountListBottomSheetSelectorsIDs,
} from '../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect } from 'appwright';

class AccountListComponent extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
      return AppwrightSelectors.getElementByID(this._device, AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT);
    }
  }

  async tapCreateAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.addAccountButton);
    } else {
      await this.tap(this.addAccountButton); // Use inherited tapElement method with retry logic
    }
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
    await this.scrollIntoView(account); // Use inherited method with retry logic
    await this.tap(account); // Tap after scrolling into view
  }
}

export default new AccountListComponent();