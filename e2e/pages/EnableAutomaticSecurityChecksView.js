import TestHelpers from '../helpers';
import Assertions from '../utils/Assertions';
import Matchers from '../utils/Matchers';

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

  static async checkIfVisible() {
    await Assertions.checkIfVisible(
      Matchers.getElementByID(ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID)
    );
  }

  static async checkIfNotVisible() {
    await Assertions.checkIfNotVisible(
      Matchers.getElementByID(ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID)
    );
  }
}
