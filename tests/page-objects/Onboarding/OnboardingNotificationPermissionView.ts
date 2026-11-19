import { OnboardingNotificationPermissionTestIds } from '../../../app/components/Views/OnboardingNotificationPermission/OnboardingNotificationPermission.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class OnboardingNotificationPermissionView {
  get enableButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      OnboardingNotificationPermissionTestIds.ENABLE_BUTTON,
    );
  }

  async enable({ expectNativePrompt = false } = {}): Promise<void> {
    const enableButton = await this.enableButton;
    await Gestures.waitAndTap(enableButton, {
      elemDescription: 'Enable onboarding notifications',
      timeout: 15000,
      checkEnabled: true,
      checkForDisplayed: true,
    });
    if (expectNativePrompt && PlatformDetector.isAndroid()) {
      // autoGrantPermissions only applies at install; fixture resets revoke it.
      await Gestures.waitAndTap(
        Matchers.getElementByAndroidUIAutomator(
          '.resourceIdMatches(".*:id/permission_allow_button")',
        ),
        { elemDescription: 'Allow Android notifications', timeout: 15000 },
      );
    }
    await Assertions.expectElementToNotExist(enableButton, {
      timeout: 15000,
      description: 'Notification setup completes',
    });
  }

  get skipButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      OnboardingNotificationPermissionTestIds.SKIP_BUTTON,
    );
  }

  async skip(): Promise<void> {
    const skipButton = await this.skipButton;
    await Gestures.waitAndTap(skipButton, {
      elemDescription: 'Onboarding notification permission skip button',
      timeout: 5000,
      checkForDisplayed: true,
      checkEnabled: true,
    });
    await Assertions.expectElementToNotExist(skipButton, {
      timeout: 5000,
      description: 'Notification permission step closes after skipping',
    });
  }
}

export default new OnboardingNotificationPermissionView();
