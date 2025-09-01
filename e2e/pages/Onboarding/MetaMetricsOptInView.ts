import { MetaMetricsOptInSelectorsIDs } from '../../selectors/Onboarding/MetaMetricsOptIn.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class MetaMetricsOptIn {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
    );
  }

  get optInMetricsContent(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
    );
  }

  get iAgreeButton(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID,
    );
  }

  get noThanksButton(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID,
    );
  }

  async swipeContentUp(): Promise<void> {
    await Gestures.swipe(this.optInMetricsContent, 'up', {
      speed: 'fast',
      percentage: 0.9,
      elemDescription: 'Opt-in Metrics Privacy Policy Content',
    });
  }

  async tapAgreeButton(): Promise<void> {
    await this.swipeContentUp();
    await Gestures.waitAndTap(this.iAgreeButton, {
      elemDescription: 'Opt-in Metrics I Agree Button',
    });
  }

  async tapNoThanksButton(): Promise<void> {
    await this.swipeContentUp();
    await Gestures.waitAndTap(this.noThanksButton, {
      elemDescription: 'Opt-in Metrics No Thanks Button',
    });
  }
}

export default new MetaMetricsOptIn();
