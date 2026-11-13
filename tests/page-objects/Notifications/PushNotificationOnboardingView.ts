import { ExistingUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/ExistingUserSheet/ExistingUserSheet.testIds';
import { NewUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.testIds';
import { type AppiumElement, Gestures, Matchers } from '../../framework';

class PushNotificationOnboardingView {
  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(NewUserSheetSelectorsIDs.TITLE);
  }

  get notNowButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW);
  }

  get existingUserTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(ExistingUserSheetSelectorsIDs.TITLE);
  }

  get existingUserNotNowButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW,
    );
  }

  async tapNotNowButton(): Promise<void> {
    await Gestures.waitAndTap(this.notNowButton, {
      elemDescription: 'Push Notification Onboarding Not Now Button',
    });
  }

  async tapExistingUserNotNowButton(): Promise<void> {
    await Gestures.waitAndTap(this.existingUserNotNowButton, {
      elemDescription: 'Personalized alerts Not Now Button',
    });
  }
}

export default new PushNotificationOnboardingView();
