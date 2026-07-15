import { OnboardingCryptoExperienceQuestionnaireTestIds } from '../../../app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.testIds';
import type { CryptoExperienceLevel } from '../../../app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.types';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class OnboardingCryptoExperienceQuestionnaireView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingCryptoExperienceQuestionnaireTestIds.SCREEN,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCryptoExperienceQuestionnaireTestIds.SCREEN,
          { exact: true },
        ),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
          { exact: true },
        ),
    });
  }

  getOptionById(id: CryptoExperienceLevel): EncapsulatedElementType {
    const testID = `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}${id}`;
    return encapsulated({
      detox: () => Matchers.getElementByID(testID),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      description: 'Onboarding Crypto Experience Questionnaire Continue Button',
    });
  }

  async tapOption(id: CryptoExperienceLevel): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getOptionById(id), {
      description: `Onboarding Crypto Experience Questionnaire Option: ${id}`,
    });
  }
}

export default new OnboardingCryptoExperienceQuestionnaireView();
