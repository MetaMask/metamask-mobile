import { OnboardingNotificationPermissionTestIds } from '../../../app/components/Views/OnboardingNotificationPermission/OnboardingNotificationPermission.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import type { AppiumElement } from '../../framework/AppiumElement';

class OnboardingNotificationPermissionView {
  get skipButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      OnboardingNotificationPermissionTestIds.SKIP_BUTTON,
    );
  }

  async skip(): Promise<void> {
    await Gestures.waitAndTap(this.skipButton, {
      elemDescription: 'Onboarding notification permission skip button',
      timeout: 5000,
      checkForDisplayed: true,
      checkEnabled: true,
    });
    await Assertions.expectElementToNotBeVisible(this.skipButton, {
      timeout: 5000,
      description: 'Notification permission step closes after skipping',
    });
  }
}

export default new OnboardingNotificationPermissionView();
