import { MetaMetricsOptInSelectorsIDs } from '../../selectors/Onboarding/MetaMetricsOptIn.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class MetaMetricsOptIn {
  get container() {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
    );
  }

  get optInMetricsContent() {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
    );
  }
  get marketingConsentCheckbox() {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.MARKETING_CONSENST_CHECK_BOX_ID,
    );
  }
  get iAgreeButton() {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID,
    );
  }

  get noThanksButton() {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID,
    );
  }

  async tapAgreeButton() {
    await Gestures.swipe(this.optInMetricsContent, 'up', 'fast', 0.9);
    await Gestures.waitAndTap(this.iAgreeButton);
  }

  async tapToOptInMarketingConsent() {
    await Gestures.waitAndTap(this.marketingConsentCheckbox);
  }

  async tapNoThanksButton() {
    await Gestures.swipe(this.optInMetricsContent, 'up', 'fast', 0.9);
    await Gestures.waitAndTap(this.noThanksButton);
  }

  async tapEditDefaultNetworkHere() {
    await Gestures.swipe(this.optInMetricsContent, 'up', 'fast', 0.9);
    if (device.getPlatform() === 'ios') {
      await Gestures.tapAtPoint(this.container, { x: 333, y: 534 });
    } else {
      await Gestures.tapAtPoint(this.optInMetricsContent, { x: 15, y: 570 });
    }
  }
}

export default new MetaMetricsOptIn();
