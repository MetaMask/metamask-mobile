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
      return AppwrightSelectors.getElementByID(this._device, AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT);
    }
  }

  get addWalletButton() {
    return AppwrightSelectors.getElementByID(this._device, 'account-list-add-account-button');
  }

  async tapCreateAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.addAccountButton);
    } else {
      await AppwrightGestures.scrollIntoView(this.device, this.addAccountButton, {scrollParams: {direction: 'down'}});
      await AppwrightGestures.tap(await this.addAccountButton); 
    }
  }

  async tapOnAddWalletButton() {
    await AppwrightGestures.tap(await this.addWalletButton); // Use static tap method with retry logic
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

  async isAccountDisplayed(name, timeout = 10000) {
    const element = await AppwrightSelectors.getElementByCatchAll(this.device, name);
    await expect(element).toBeVisible({ timeout });
  }

  async tapOnAccountByName(name) {
    const account = await AppwrightSelectors.getElementByText(this.device, name);
    await AppwrightGestures.scrollIntoView(this.device, account); // Use inherited method with retry logic
    await AppwrightGestures.tap(account); // Tap after scrolling into view
  }

  async waitForSyncingToComplete() {
    const syncingElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Syncing');
    await AppwrightSelectors.waitForElementToDisappear(syncingElement, 'Syncing', 30000);
    const discoveringAccountsElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Discovering');
    await AppwrightSelectors.waitForElementToDisappear(discoveringAccountsElement, 'Discovering accounts...', 30000);

    const addButton = await this.addAccountButton;
    await expect(addButton).toBeVisible({ timeout: 30000 });
  }
}

export default new AccountListComponent();