import { ManualBackUpStepsSelectorsIDs } from '../../selectors/Onboarding/ManualBackUpSteps.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
// Import Appwright dependencies for dual compatibility
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';
import { Device, expect } from 'appwright';

class ProtectYourWalletView {
  private _device?: Device;

  get device(): Device | undefined {
    return this._device;
  }

  set device(device: Device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
      );

  }

  get remindMeLaterButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
      );

  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.remindMeLaterButton);
    } else {
      // Appwright framework
      const button = await this.remindMeLaterButton;
      await button.tap();
    }
  }

  async isVisible(): Promise<void> {
    if (this._device) {
      // Appwright framework
      expect(await this.container).toBeVisible({ timeout: 10000 });
    }
  }
}

export default new ProtectYourWalletView();
