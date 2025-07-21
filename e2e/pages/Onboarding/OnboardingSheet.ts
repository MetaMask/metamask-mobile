import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { OnboardingSheetSelectorIDs } from '../../selectors/Onboarding/OnboardingSheet.selectors';

class OnboardingSheet {
  get container() {
    return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton() {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
    );
  }

  get appleLoginButton() {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
    );
  }

  get importSeedButton() {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
    );
  }

  async tapGoogleLoginButton() {
    await Gestures.waitAndTap(this.googleLoginButton);
  }

  async tapAppleLoginButton() {
    await Gestures.waitAndTap(this.appleLoginButton);
  }

  async tapImportSeedButton() {
    await Gestures.waitAndTap(this.importSeedButton);
  }
}

export default new OnboardingSheet();
