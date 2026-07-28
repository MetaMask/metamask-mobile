import { NewUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
} from '../../framework';

class PushNotificationOnboardingView {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(NewUserSheetSelectorsIDs.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(NewUserSheetSelectorsIDs.TITLE, {
          exact: true,
        }),
    });
  }

  get notNowButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NewUserSheetSelectorsIDs.BUTTON_NOT_NOW,
          { exact: true },
        ),
    });
  }

  async tapNotNowButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notNowButton, {
      description: 'Push Notification Onboarding Not Now Button',
    });
  }
}

export default new PushNotificationOnboardingView();
