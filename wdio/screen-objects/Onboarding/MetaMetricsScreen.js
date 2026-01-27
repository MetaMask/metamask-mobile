import Gestures from '../../helpers/Gestures';
import {
  OPTIN_METRICS_CONTINUE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
} from '../testIDs/Screens/OptinMetricsScreen.testIds';
import Selectors from '../../helpers/Selectors';
import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class MetaMetricsScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

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

  get continueButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID);
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

  async tapContinueButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.continueButton);
    } else {
      const element = await this.continueButton;
      await appwrightExpect(element).toBeVisible({ timeout: 30000 });
      await element.tap();
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
      await AppwrightGestures.tap(await this.iAgreeButton);
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
