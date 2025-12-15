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

  async waitForSyncingToComplete(timeout = 60000) {
    console.log('⏳ waitForSyncingToComplete: Starting...');
    const startTime = Date.now();
    const pollInterval = 500;
    
    const syncingElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Syncing');
    const discoveringElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Discovering');

    
    while (Date.now() - startTime < timeout) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const addButton = await this.addAccountButton;
      // Check if loading indicators are gone
      const isSyncing = await syncingElement.isVisible({ timeout: 200 }).catch(() => false);
      const isDiscovering = await discoveringElement.isVisible({ timeout: 200 }).catch(() => false);
      const isAddButtonVisible = await addButton.isVisible({ timeout: 200 }).catch(() => false);
      
      // Success: no loading indicators AND add button is visible
      if (!isSyncing && !isDiscovering && isAddButtonVisible) {
        console.log(`✅ waitForSyncingToComplete: Completed after ${elapsed}s`);
        return;
      }
      
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Syncing did not complete within ${timeout / 1000} seconds`);
  }
}

export default new AccountListComponent();