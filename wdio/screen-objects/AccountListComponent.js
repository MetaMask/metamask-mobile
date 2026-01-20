import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AccountListBottomSheetSelectorsIDs,
} from '../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
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
    const initialWaitTimeout = 5000; // 5 seconds to wait for syncing/discovering to appear
    
    const getElapsed = () => ((Date.now() - startTime) / 1000).toFixed(1);

    const syncingElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Syncing');
    const discoveringElement = await AppwrightSelectors.getElementByCatchAll(this.device, 'Discovering');

    // Step 1: Wait up to 5 seconds for "Syncing" or "Discovering" to appear
    console.log('⏳ Step 1: Waiting up to 5s for "Syncing" or "Discovering" to appear...');
    let syncingDetected = false;
    while (Date.now() - startTime < initialWaitTimeout) {
      const isSyncing = await syncingElement.isVisible({ timeout: 200 }).catch(() => false);
      const isDiscovering = await discoveringElement.isVisible({ timeout: 200 }).catch(() => false);
      
      if (isSyncing || isDiscovering) {
        syncingDetected = true;
        console.log(`✅ Step 1: Loading detected after ${getElapsed()}s (Syncing: ${isSyncing}, Discovering: ${isDiscovering})`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // If nothing appeared after 5 seconds, we're done
    if (!syncingDetected) {
      console.log(`✅ waitForSyncingToComplete: No syncing detected after 5s, finishing after ${getElapsed()}s`);
      return;
    }

    // Step 2: Wait for "Syncing" to disappear
    console.log('⏳ Step 2: Waiting for "Syncing" to disappear...');
    while (Date.now() - startTime < timeout) {
      const isSyncing = await syncingElement.isVisible({ timeout: 200 }).catch(() => false);
      if (!isSyncing) {
        console.log(`✅ Step 2: "Syncing" disappeared after ${getElapsed()}s`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Step 3: Wait 1 second delay
    console.log('⏳ Step 3: Waiting 1 second...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Wait for "Discovering" to disappear
    console.log('⏳ Step 4: Waiting for "Discovering" to disappear...');
    while (Date.now() - startTime < timeout) {
      const isDiscovering = await discoveringElement.isVisible({ timeout: 200 }).catch(() => false);
      if (!isDiscovering) {
        console.log(`✅ Step 4: "Discovering" disappeared after ${getElapsed()}s`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    console.log(`✅ waitForSyncingToComplete: Completed after ${getElapsed()}s`);
  }
}

export default new AccountListComponent();