import TestHelpers from '../helpers';

import {
  ENABLE_DEVICE_NOTIFICATIONS_CONTAINER_ID,
  ENABLE_DEVICE_NOTIFICATIONS_NO_THANKS_BUTTON_ID,
  ENABLE_DEVICE_NOTIFICATIONS_YES_BUTTON_ID
} from '../../wdio/screen-objects/testIDs/Screens/EnableDeviceNotificationsChecksAlert.testIds';

export default class EnableDeviceNotificationsAlert {
  static async tapNoThanks() {
    await TestHelpers.waitAndTapByLabel(
      ENABLE_DEVICE_NOTIFICATIONS_NO_THANKS_BUTTON_ID
    );
  }

  static async tapYes() {
    await TestHelpers.waitAndTapByLabel(
      ENABLE_DEVICE_NOTIFICATIONS_YES_BUTTON_ID,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      ENABLE_DEVICE_NOTIFICATIONS_CONTAINER_ID,
    );
  }
}
