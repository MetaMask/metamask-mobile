import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from "../../../tests/framework/AppwrightGestures";
import { expect } from 'appwright';
import { PerpsGTMModalSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';

class PerpsGTMModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

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
      await AppwrightGestures.tap(await this.notNowButton);
    }
  }

  async tapGetStartedButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.getStartedButton);
    } else {
      await AppwrightGestures.tap(await this.getStartedButton);
    }
  }
}

export default new PerpsGTMModal();
