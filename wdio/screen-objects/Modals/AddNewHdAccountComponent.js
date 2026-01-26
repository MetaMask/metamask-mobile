import Gestures from '../../helpers/Gestures.js';
import { AddNewAccountIds } from '../../../app/components/Views/AddNewAccount/AddHdAccount.testIds';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class AddNewHdAccountComponent {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }
  
  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddNewAccountIds.CONTAINER);
    }
  }

  get srpSelector() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.SRP_SELECTOR);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddNewAccountIds.SRP_SELECTOR);
    }
  }

  get cancelButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.CANCEL);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddNewAccountIds.CANCEL);
    }
  }

  get confirmButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.CONFIRM);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddNewAccountIds.CONFIRM);
    }
  }

  get nameInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.NAME_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddNewAccountIds.NAME_INPUT);
    }
  }

  async isSrpSelectorVisible() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddNewAccountIds.SRP_SELECTOR).isDisplayed();
    } else {
      const srpSelector = await this.srpSelector;
      await appwrightExpect(srpSelector).toBeVisible({ timeout: 10000 });
    }
  }

  async tapSrpSelector() {
    if (!this._device) {
      await Gestures.waitAndTap(this.srpSelector);
    } else {
      await this.srpSelector.tap();
    }
  }

  async tapCancel() {
    if (!this._device) {
      await Gestures.waitAndTap(this.cancelButton);
    } else {
      await this.cancelButton.tap();
    }
  }

  async tapConfirm() {
    if (!this._device) {
      await Gestures.waitAndTap(this.confirmButton, {
        elemDescription: 'Confirm button on Add New HD Account screen',
      });
    } else {
      const confirmButton = await this.confirmButton;
      await confirmButton.tap();
    }
  }
}

export default new AddNewHdAccountComponent();
