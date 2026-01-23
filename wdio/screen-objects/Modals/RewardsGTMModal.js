import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from "../../../tests/framework/AppwrightGestures";
import { expect as appwrightExpect } from 'appwright';

class RewardsGTMModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get notNowButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      'rewards-view-skip-button',
    );
  }

  get container() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'Rewards are here');
  }

  async isVisible() {
    const modal = await this.container;
    appwrightExpect(await modal).toBeVisible();
  }

  async tapNotNowButton() {
    await AppwrightGestures.tap(await this.notNowButton);
  }
}

export default new RewardsGTMModal();
