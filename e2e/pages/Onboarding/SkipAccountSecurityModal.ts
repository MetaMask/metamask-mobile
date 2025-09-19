import { SkipAccountSecurityModalSelectorsIDs } from '../../selectors/Onboarding/SkipAccountSecurityModal.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
// Import Appwright dependencies for dual compatibility
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';
import { Device, expect } from 'appwright';

class SkipAccountSecurityModal {
  private _device?: Device;

  get device(): Device | undefined {
    return this._device;
  }

  set device(device: Device) {
    this._device = device;
  }

  get iUnderstandCheckbox(): DetoxElement {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
      );

  }

  get skipButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
      );

  }

  get cancelButton(): DetoxElement {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
      );

  }

  async tapIUnderstandCheckBox(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.iUnderstandCheckbox);
    } else {
      // Appwright framework
      const checkbox = await this.iUnderstandCheckbox;
      await checkbox.tap();
    }
  }

  async tapSkipButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.skipButton);
    } else {
      // Appwright framework
      const button = await this.skipButton;
      await button.tap();
    }
  }

  async tapCancelButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.cancelButton);
    } else {
      // Appwright framework
      const button = await this.cancelButton;
      await button.tap();
    }
  }

  async isVisible(): Promise<void> {
    if (this._device) {
      // Appwright framework
      expect(await this.skipButton).toBeVisible({ timeout: 10000 });
    }
  }
}

export default new SkipAccountSecurityModal();
