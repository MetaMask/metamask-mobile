import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

import {
  EnableDeviceNotificationsAlertSelectorText
} from '../../selectors/Onboarding/EnableDeviceNotificationsAlert.selectors';

class EnableDeviceNotificationsAlert {
  get stepOneContainer() {
    return Matchers.getSystemElementByText(EnableDeviceNotificationsAlertSelectorText.CONTAINER);
  }

  get getEnableDeviceNotificationsButton() {
    return Matchers.getSystemElementByText(
      EnableDeviceNotificationsAlertSelectorText.YES_BUTTON,
    );
  }

  async tapOnEnableDeviceNotificationsButton() {
    await Gestures.waitAndTap(this.getEnableDeviceNotificationsButton, {
      elemDescription: 'Enable Device Notifications Button',
    });
  }
}

export default new EnableDeviceNotificationsAlert();
