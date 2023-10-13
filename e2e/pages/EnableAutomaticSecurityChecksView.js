import TestHelpers from '../helpers';

import {
  ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
  ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Screens/EnableAutomaticSecurityChecksScreen.testIds';

export default class EnableAutomaticSecurityChecksView {
  static async tapNoThanks() {
    await TestHelpers.waitAndTap(
      ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON_ID,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
    );
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
    );
  }
}
