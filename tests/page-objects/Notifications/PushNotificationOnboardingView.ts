import { NewUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.testIds';
import { EncapsulatedElementType, Gestures, Matchers } from '../../framework';

class PushNotificationOnboardingView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(NewUserSheetSelectorsIDs.TITLE);
  }

  get notNowButton(): EncapsulatedElementType {
    return Matchers.getElementByID(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW);
  }

  async tapNotNowButton(): Promise<void> {
    await Gestures.waitAndTap(this.notNowButton, {
      elemDescription: 'Push Notification Onboarding Not Now Button',
    });
  }
}

export default new PushNotificationOnboardingView();
