import Matchers from '../../framework/Matchers';

import { EnableDeviceNotificationsAlertSelectorText } from '../../selectors/Onboarding/EnableDeviceNotificationsAlert.selectors';
import UnifiedGestures from '../../framework/UnifiedGestures';

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
    await UnifiedGestures.waitAndTap(this.getEnableDeviceNotificationsButton, {
      elemDescription: 'Enable Device Notifications Button',
    });
  }
}

export default new EnableDeviceNotificationsAlert();
