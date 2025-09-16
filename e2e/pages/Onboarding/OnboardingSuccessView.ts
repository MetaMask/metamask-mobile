import { OnboardingSuccessSelectorIDs } from '../../selectors/Onboarding/OnboardingSuccess.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Device, expect } from 'appwright';
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';

class OnboardingSuccessView {
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
      return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSuccessSelectorIDs.CONTAINER_ID,
      );

  }

  get doneButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSuccessSelectorIDs.DONE_BUTTON,
      );

  }

  async tapDone(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.doneButton, {
        elemDescription: 'Onboarding Success Done Button',
      });
    } else {
      // Appwright framework
      const button = await this.doneButton;
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

export default new OnboardingSuccessView();
