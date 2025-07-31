import { MetaMetricsOptInSelectorsIDs } from '../../selectors/Onboarding/MetaMetricsOptIn.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

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

  async swipeContentUp() {
    await Gestures.swipe(this.optInMetricsContent, 'up', {
      speed: 'fast',
      percentage: 0.9,
      elemDescription: 'Opt-in Metrics Privacy Policy Content',
    });
  }

  async tapAgreeButton() {
    await this.swipeContentUp();
    await Gestures.waitAndTap(this.iAgreeButton, {
      elemDescription: 'Opt-in Metrics I Agree Button',
    });
  }

  async tapNoThanksButton() {
    await this.swipeContentUp();
    await Gestures.waitAndTap(this.noThanksButton, {
      elemDescription: 'Opt-in Metrics No Thanks Button',
    });
  }
}

export default new MetaMetricsOptIn();
