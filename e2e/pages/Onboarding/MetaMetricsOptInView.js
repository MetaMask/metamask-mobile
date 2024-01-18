import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
  METAMETRICS_OPT_IN_CONTAINER_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/OptinMetricsScreen.testIds';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class MetaMetricsOptIn {
  get container() {
    return Matchers.getElementByID(METAMETRICS_OPT_IN_CONTAINER_ID);
  }

  get optInMetricsContent() {
    return Matchers.getElementByID(
      OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
    );
  }

  get iAgreeButton() {
    return Matchers.getElementByID(OPTIN_METRICS_I_AGREE_BUTTON_ID);
  }

  get noThanksButton() {
    return Matchers.getElementByID(OPTIN_METRICS_NO_THANKS_BUTTON_ID);
  }

  async tapAgreeButton() {
    await Gestures.swipe(this.optInMetricsContent, 'up', 'fast', 0.9);
    await Gestures.waitAndTap(this.iAgreeButton);
  }

  async tapNoThanksButton() {
    await Gestures.swipe(this.optInMetricsContent, 'up', 'fast', 0.9);
    await Gestures.waitAndTap(this.noThanksButton);
  }
}

export default new MetaMetricsOptIn();
