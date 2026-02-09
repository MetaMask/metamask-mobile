import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

import { EnableDeviceNotificationsAlertSelectorText } from '../../selectors/Onboarding/EnableDeviceNotificationsAlert.selectors.ts';

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
