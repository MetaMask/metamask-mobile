import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

import { EnableDeviceNotificationsAlertSelectorText } from '../../selectors/Onboarding/EnableDeviceNotificationsAlert.selectors';

class EnableDeviceNotificationsAlert {
  get stepOneContainer(): Promise<AppiumElement> {
    return Matchers.getSystemElementByText(
      EnableDeviceNotificationsAlertSelectorText.CONTAINER,
    );
  }

  get getEnableDeviceNotificationsButton(): Promise<AppiumElement> {
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
