import { OnboardingInterestQuestionnaireTestIds } from '../../../app/components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

type InterestOptionId =
  | 'buy_and_sell_crypto'
  | 'consolidate_wallets'
  | 'advanced_trades'
  | 'predict_sports_events'
  | 'crypto_as_money'
  | 'connect_apps_sites';

class OnboardingInterestQuestionnaireView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingInterestQuestionnaireTestIds.SCREEN,
    );
  }

  get continueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
    );
  }

  get skipButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON,
    );
  }

  getOptionById(id: InterestOptionId): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${id}`,
    );
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.tap(this.continueButton, {
      elemDescription: 'Onboarding Interest Questionnaire Continue Button',
      timeout: 2000,
    });
  }

  async tapSkipButton(): Promise<void> {
    await Gestures.tap(this.skipButton, {
      elemDescription: 'Onboarding Interest Questionnaire Skip Button',
      timeout: 2000,
    });
  }

  async tapOption(id: InterestOptionId): Promise<void> {
    await Gestures.waitAndTap(this.getOptionById(id), {
      elemDescription: `Onboarding Interest Questionnaire Option: ${id}`,
      timeout: 2000,
    });
  }
}

export default new OnboardingInterestQuestionnaireView();
