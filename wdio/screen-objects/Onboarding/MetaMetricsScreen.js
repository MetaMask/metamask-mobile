import Gestures from '../../helpers/Gestures';
import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
} from '../testIDs/Screens/OptinMetricsScreen.testIds';
import Selectors from '../../helpers/Selectors';
import { MetaMetricsOptInSelectorsIDs } from '../../../e2e/selectors/Onboarding/MetaMetricsOptIn.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class MetaMetricsScreen{

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
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID);
    }
  }

  get noThanksButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID);
    }
  }

  async isScreenTitleVisible(timeout = 30000) {
    if (!this._device) {
      await expect(this.screenTitle).toBeDisplayed();
    } else {
      const element = await this.screenTitle;
      await appwrightExpect(element).toBeVisible({ timeout }); // Some devices take longer to transition to this screen
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
      const button = await this.iAgreeButton;
      await button.tap();
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
