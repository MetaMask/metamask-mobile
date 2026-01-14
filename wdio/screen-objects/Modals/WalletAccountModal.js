import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class WalletAccountModal {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get accountNameLabelText() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT);
    }
  }

  get accountNameLabelInput() {
    return Selectors.getElementByPlatform(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_INPUT);
  }

  get walletAccountOverview() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_OVERVIEW);
  }

  async longPressAccountNameLabel() {
    await Gestures.longPress(this.accountNameLabelText, 1000);
  }

  async editAccountNameLabel(text) {
    await Gestures.typeText(this.accountNameLabelInput, text);
  }

  async isAccountNameLabelEditable() {
    await expect(this.accountNameLabelInput).toBeDisplayed();
  }

  async isAccountNameLabelVisible(expectedName) {
    if (!this._device) {
      await expect(this.accountNameLabelText).toHaveText(expectedName);
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, expectedName);
      await appwrightExpect(element).toBeVisible();
    }
  }

  async isAccountNameLabelEqualTo(expected) {
    if (!this._device) {
      await expect(this.accountNameLabelText).toHaveText(expected);
    } else {
      const element = await this.accountNameLabelText;
      const text = await element.getText();
      await appwrightExpect(text).toBe(expected);
    }
  }

  async isAccountInputLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelInput;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }

  async isAccountOverview() {
    await expect(await this.walletAccountOverview).toBeDisplayed();
  }
}

export default new WalletAccountModal();
