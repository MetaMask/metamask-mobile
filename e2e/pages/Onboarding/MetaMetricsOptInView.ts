import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

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
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
    );
  }

  get metricsCheckbox(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
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
      elemDescription: 'Opt-in Metrics Continue Button',
    });
  }

  async tapMetricsCheckbox(): Promise<void> {
    await Gestures.waitAndTap(this.metricsCheckbox, {
      elemDescription: 'Opt-in Metrics Metrics Checkbox',
    });
  }
}

export default new MetaMetricsOptIn();
