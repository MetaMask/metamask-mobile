import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { OnboardingSheetSelectorIDs } from '../../../app/components/Views/OnboardingSheet/OnboardingSheet.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

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

  get importSeedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
        ),
    });
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
    await UnifiedGestures.waitAndTap(this.importSeedButton, {
      description: 'Import Seed Button in Onboarding Sheet',
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.importSeedButton);
        await el.waitForDisplayed({ timeout: 10000 });
      },
    });
  }
}

export default new OnboardingSheet();
