import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from "../../../e2e/framework/AppwrightGestures";
import { expect as appwrightExpect } from 'appwright';

class RewardsGTMModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get notNowButton() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Not now',
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
    const notNowButton = await this.notNowButton;
    await AppwrightGestures.tap(notNowButton);
  }
}

export default new RewardsGTMModal();