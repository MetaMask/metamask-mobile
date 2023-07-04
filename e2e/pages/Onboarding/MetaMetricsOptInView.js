import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
  METAMETRICS_OPT_IN_CONTAINER_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/OptinMetricsScreen.testIds';
import TestHelpers from '../../helpers';
export default class MetaMetricsOptIn {
  static async tapAgreeButton() {
    await TestHelpers.swipe(
      OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
      'up',
      'slow',
      0.6,
    );

    await TestHelpers.waitAndTap(OPTIN_METRICS_I_AGREE_BUTTON_ID);
  }

  static async tapNoThanksButton() {
    await TestHelpers.swipe(
      OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
      'up',
      'slow',
      0.6,
    );

    await TestHelpers.waitAndTap(OPTIN_METRICS_NO_THANKS_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
  }
}
