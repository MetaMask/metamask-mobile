import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

import { EnableDeviceNotificationsAlertSelectorText } from '../../locators/Onboarding/EnableDeviceNotificationsAlert.selectors';

class EnableDeviceNotificationsAlert {
  get stepOneContainer(): DetoxElement {
    return Matchers.getSystemElementByText(
      EnableDeviceNotificationsAlertSelectorText.CONTAINER,
    );
  }

  get getEnableDeviceNotificationsButton(): DetoxElement {
    return Matchers.getSystemElementByText(
      EnableDeviceNotificationsAlertSelectorText.YES_BUTTON,
    );
  }

  async tapOnEnableDeviceNotificationsButton(): Promise<void> {
    await Gestures.waitAndTap(this.getEnableDeviceNotificationsButton, {
      elemDescription: 'Enable Device Notifications Button',
    });
  }
}

export default new EnableDeviceNotificationsAlert();
