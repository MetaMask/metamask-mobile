import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AccountListBottomSheetSelectorsIDs,
} from '../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { expect, ScrollDirection } from 'appwright';

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

  async tapCreateAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.addAccountButton);
    } else {
      const element = await this.addAccountButton;
      await element.tap();
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
    await AppwrightSelectors.scrollIntoView(this.device, account);
    await account.tap();
    /*
    console.log('account ->', account);
    try {
      await account.tap();
    } catch (error) {
      console.log('Error tapping on account ->', error);
      await this.device.pause(10000000);
      await this.device.scroll();
      account = await AppwrightSelectors.getElementByText(this.device, name);

      await account.tap();
    }*/
  }
}

export default new AccountListComponent();