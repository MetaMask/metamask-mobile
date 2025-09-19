import { MetaMetricsOptInSelectorsIDs } from '../../selectors/Onboarding/MetaMetricsOptIn.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Device, expect } from 'appwright';
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';

class MetaMetricsOptIn {
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
      return Matchers.getElementByID(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

  }

  get optInMetricsContent() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
      );

  }

  get iAgreeButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID,
      );

  }

  get noThanksButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID,
      );

  }

  async swipeContentUp(): Promise<void> {
    if (!this._device) {
      await Gestures.swipe(this.optInMetricsContent, 'up', {
        speed: 'fast',
        percentage: 0.9,
        elemDescription: 'Opt-in Metrics Privacy Policy Content',
      });
    } else {
      await AppwrightSelectors.scrollDown(this._device);
    }
  }

  async tapAgreeButton(): Promise<void> {
    await this.swipeContentUp();
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.iAgreeButton, {
        elemDescription: 'Opt-in Metrics I Agree Button',
      });
    } else {
      // Appwright framework
      const button = await this.iAgreeButton;
      await button.tap();
    }
  }

  async tapNoThanksButton(): Promise<void> {
    await this.swipeContentUp();
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.noThanksButton, {
        elemDescription: 'Opt-in Metrics No Thanks Button',
      });
    } else {
      // Appwright framework
      const button = await this.noThanksButton;
      await this.swipeContentUp();
      await button.tap();
    }
  }

  async isScreenTitleVisible(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.iAgreeButton, {
        elemDescription: 'Opt-in Metrics I Agree Button',
      });
    } else {
      // Appwright framework
      const button = await this.iAgreeButton;
      expect(await button).toBeVisible({ timeout: 10000 });
    }
  }
}

export default new MetaMetricsOptIn();
