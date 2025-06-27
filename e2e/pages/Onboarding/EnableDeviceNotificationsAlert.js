import Gestures from '../../utils/Gestures.ts';
import Matchers from '../../utils/Matchers.ts';

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
    await Gestures.waitAndTap(this.getEnableDeviceNotificationsButton);
  }
}

export default new EnableDeviceNotificationsAlert();
