import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';

import {
  ENABLE_DEVICE_NOTIFICATIONS_CONTAINER_ID,
  ENABLE_DEVICE_NOTIFICATIONS_NO_THANKS_BUTTON_ID,
  ENABLE_DEVICE_NOTIFICATIONS_YES_BUTTON_ID
} from '../../wdio/screen-objects/testIDs/Screens/EnableDeviceNotificationsChecksAlert.testIds';

class EnableDeviceNotificationsAlert {
  get stepOneContainer() {
    return Matchers.getSystemElementByText(ENABLE_DEVICE_NOTIFICATIONS_CONTAINER_ID);
  }

  get getEnableDeviceNotificationsButton() {
    return Matchers.getSystemElementByText(
      ENABLE_DEVICE_NOTIFICATIONS_YES_BUTTON_ID,
    );
  }

  get getNotEnableDeviceNotificationsButton() {
    return Matchers.getSystemElementByText(
      ENABLE_DEVICE_NOTIFICATIONS_NO_THANKS_BUTTON_ID,
    );
  }

  async tapOnEnableDeviceNotificationsButton() {
    await Gestures.waitAndTap(this.getEnableDeviceNotificationsButton);
  }

  async tapOnNotEnableDeviceNotificationsButton() {
    await Gestures.waitAndTap(this.getNotEnableDeviceNotificationsButton);
  }
}

export default new EnableDeviceNotificationsAlert();
