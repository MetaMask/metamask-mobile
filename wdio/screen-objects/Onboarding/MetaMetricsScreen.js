import Gestures from '../../helpers/Gestures';
import {
  OPTIN_METRICS_CONTINUE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
} from '../testIDs/Screens/OptinMetricsScreen.testIds';
import Selectors from '../../helpers/Selectors';
import { MetaMetricsOptInSelectorsIDs } from '../../../e2e/selectors/Onboarding/MetaMetricsOptIn.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class MetaMetricsScreen extends AppwrightGestures {
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

  get screenTitle() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID);
    }
  }

  get iAgreeButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID);
    }
  }

  async isScreenTitleVisible() {
    if (!this._device) {
      await expect(this.screenTitle).toBeDisplayed();
    } else {
      const element = await this.screenTitle;
      await appwrightExpect(element).toBeVisible({ timeout: 30000 }); // Some devices take longer to transition to this screen
    }
  }

  async tapIAgreeButton() {
    if (!this._device) {
      const element = await this.iAgreeButton;
      await element.waitForDisplayed();
      await Gestures.swipeUp(0.5);
      await Gestures.swipeUp(0.5);
      await element.waitForEnabled();
      await Gestures.waitAndTap(this.iAgreeButton);
    } else {
      await this.tap(this.iAgreeButton); // Use inherited tapElement method with retry logic
    }
  }

  async tapNoThanksButton() {
    if (!this._device) {
      await Gestures.swipeUp(0.5);
      const element = await this.iAgreeButton;
      await element.waitForEnabled();
      await Gestures.waitAndTap(this.noThanksButton);
    } else {
      await this.noThanksButton.tap();
    }
  }
}

export default new MetaMetricsScreen();
