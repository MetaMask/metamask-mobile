import { OnboardingCryptoExperienceQuestionnaireTestIds } from '../../../app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.testIds';
import type { CryptoExperienceLevel } from '../../../app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.types';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class OnboardingCryptoExperienceQuestionnaireView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingCryptoExperienceQuestionnaireTestIds.SCREEN,
    );
  }

  get continueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
    );
  }

  getOptionById(id: CryptoExperienceLevel): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}${id}`,
    );
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription:
        'Onboarding Crypto Experience Questionnaire Continue Button',
    });
  }

  async tapOption(id: CryptoExperienceLevel): Promise<void> {
    await Gestures.waitAndTap(this.getOptionById(id), {
      elemDescription: `Onboarding Crypto Experience Questionnaire Option: ${id}`,
    });
  }
}

export default new OnboardingCryptoExperienceQuestionnaireView();
