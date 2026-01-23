import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';

import { EnableDeviceNotificationsAlertSelectorText } from '../../selectors/Onboarding/EnableDeviceNotificationsAlert.selectors';

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
