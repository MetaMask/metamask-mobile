import Matchers from '../../framework/Matchers';
import { OnboardingSheetSelectorIDs } from '../../../app/components/Views/OnboardingSheet/OnboardingSheet.testIds';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class OnboardingSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get appleLoginButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get importSeedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async tapGoogleLoginButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.googleLoginButton, {
      description: 'Google Login Button in Onboarding Sheet',
    });
  }

  async tapAppleLoginButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.appleLoginButton, {
      description: 'Apple Login Button in Onboarding Sheet',
    });
  }

  async tapImportSeedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importSeedButton, {
      description: 'Import Seed Button in Onboarding Sheet',
    });
  }
}

export default new OnboardingSheet();
