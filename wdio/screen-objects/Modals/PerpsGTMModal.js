import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from "../../../e2e/framework/AppwrightGestures";
import { expect } from 'appwright';
import { PerpsGTMModalSelectorsIDs } from '../../../e2e/selectors/Perps/Perps.selectors';

class PerpsGTMModal extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
  }

  get notNowButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
      );
    }
  }

  get getStartedButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON,
      );
    }
  }
  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL);
    }
  }


  
  async tapNotNowButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.notNowButton);
    } else {
      await this.tap(this.notNowButton);
    }
  }

  async tapGetStartedButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.getStartedButton);
    } else {
      await this.tap(this.getStartedButton);
    }
  }
}

export default new PerpsGTMModal();