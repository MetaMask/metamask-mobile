import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from "../../../e2e/framework/AppwrightGestures";
import enContent from '../../../locales/languages/en.json';

class RewardsGTMModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get notNowButton() {
    if (!this._device) {
        return Selectors.getXpathElementByText(enContent.rewards.onboarding.intro_skip);
      } else {
        if (AppwrightSelectors.isIOS(this._device)) {
          return AppwrightSelectors.getElementByCatchAll(this._device, "(//XCUIElementTypeOther[@name=\"content-container\"])[2]");
        } else {
          return AppwrightSelectors.getElementByText(this._device, enContent.rewards.onboarding.intro_skip);
        }
      }
  }

  get getStartedButton() {
    if (!this._device) {
        return Selectors.getXpathElementByText(enContent.rewards.onboarding.gtm_confirm);
      } else {
        return AppwrightSelectors.getElementByText(this._device, enContent.rewards.onboarding.gtm_confirm);
      }
  }
  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByText(enContent.rewards.onboarding.gtm_description);
    } else {
      if (AppwrightSelectors.isIOS(this._device)) {
        return AppwrightSelectors.getElementByXpath(this._device, "(//XCUIElementTypeStaticText[@name=\"Earn points for your activity.  Advance through levels to unlock rewards.\"])[2]");
      } else {
        return AppwrightSelectors.getElementByText(this._device, enContent.rewards.onboarding.gtm_description);
      }
    }
  }

  
  async tapNotNowButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.notNowButton);
    } else {
      await AppwrightGestures.tap(this.notNowButton);
    }
  }

  async tapGetStartedButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.getStartedButton);
    } else {
      await AppwrightGestures.tap(this.getStartedButton);
    }
  }
}

export default new RewardsGTMModal();