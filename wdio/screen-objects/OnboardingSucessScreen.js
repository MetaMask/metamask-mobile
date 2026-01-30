import { OnboardingSuccessSelectorIDs } from '../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';


class OnboardingSuccessView {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }
  get doneButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingSuccessSelectorIDs.DONE_BUTTON);
    }
  }

  async isVisible() {
    const element = await this.doneButton;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }

  async tapDone() {
    if (!this.device) {
      await Gestures.waitAndTap(this.doneButton);
    } else {
      const button = await this.doneButton;
      await button.tap();
    }
  }
}

export default new OnboardingSuccessView();
