import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnboardingSheetSelectorIDs } from '../../selectors/Onboarding/OnboardingSheet.selectors';

class OnboardingSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
    );
  }

  get appleLoginButton(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
    );
  }

  get importSeedButton(): DetoxElement {
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

  async tapImportSeedButton(): Promise<void> {
    await Gestures.waitAndTap(this.importSeedButton, {
      elemDescription: 'Import Seed Button in Onboarding Sheet',
    });
  }
}

export default new OnboardingSheet();
