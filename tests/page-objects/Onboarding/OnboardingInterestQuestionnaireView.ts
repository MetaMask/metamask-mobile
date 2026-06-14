import { OnboardingInterestQuestionnaireTestIds } from '../../../app/components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

type InterestOptionId =
  | 'buy_and_sell_crypto'
  | 'consolidate_wallets'
  | 'advanced_trades'
  | 'predict_sports_events'
  | 'crypto_as_money'
  | 'connect_apps_sites';

class OnboardingInterestQuestionnaireView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingInterestQuestionnaireTestIds.SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingInterestQuestionnaireTestIds.SCREEN,
          { exact: true },
        ),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
          { exact: true },
        ),
    });
  }

  getOptionById(id: InterestOptionId): EncapsulatedElementType {
    const testID = `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${id}`;
    return encapsulated({
      detox: () => Matchers.getElementByID(testID),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.tap(this.continueButton, {
      description: 'Onboarding Interest Questionnaire Continue Button',
      timeout: 2000,
    });
  }

  async tapOption(id: InterestOptionId): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getOptionById(id), {
      description: `Onboarding Interest Questionnaire Option: ${id}`,
      timeout: 2000,
    });
  }
}

export default new OnboardingInterestQuestionnaireView();
