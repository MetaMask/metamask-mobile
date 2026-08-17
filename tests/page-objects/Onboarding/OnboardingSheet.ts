import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnboardingSheetSelectorIDs } from '../../../app/components/Views/OnboardingSheet/OnboardingSheet.testIds';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class OnboardingSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
    );
  }

  get appleLoginButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
    );
  }

  get telegramLoginButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON,
    );
  }

  get importSeedButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
    );
  }

  async tapGoogleLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.googleLoginButton, {
      elemDescription: 'Google Login Button in Onboarding Sheet',
    });
  }

  async tapAppleLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.appleLoginButton, {
      elemDescription: 'Apple Login Button in Onboarding Sheet',
    });
  }

  async tapTelegramLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.telegramLoginButton, {
      elemDescription: 'Telegram Login Button in Onboarding Sheet',
    });
  }

  async tapImportSeedButton(): Promise<void> {
    await Gestures.waitAndTap(this.importSeedButton, {
      elemDescription: 'Import Seed Button in Onboarding Sheet',
    });
  }
}

export default new OnboardingSheet();
