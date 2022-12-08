import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
} from '../../../wdio/features/testIDs/Screens/OptinMetricsScreen.testIds';
import TestHelpers from '../../helpers';

const METAMETRICS_OPT_IN_CONTAINER_ID = 'metaMetrics-OptIn';
export default class MetaMetricsOptIn {
  static async tapAgreeButton() {
    await TestHelpers.waitAndTap(OPTIN_METRICS_I_AGREE_BUTTON_ID);
  }

  static async tapNoThanksButton() {
    await TestHelpers.waitAndTap(OPTIN_METRICS_NO_THANKS_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
  }
}
