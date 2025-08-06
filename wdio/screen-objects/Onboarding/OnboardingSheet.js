import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSheetSelectorIDs } from '../../../e2e/selectors/Onboarding/OnboardingSheet.selectors';

class OnboardingSheet {
  get container() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON);
  }

  get appleLoginButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON);
  }

  get importSeedButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON);
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
