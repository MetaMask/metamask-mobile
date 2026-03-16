import { OnboardingSuccessSelectorIDs } from '../../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class OnboardingSuccessView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  get doneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSuccessSelectorIDs.DONE_BUTTON,
        ),
    });
  }

  async tapDone(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.doneButton, {
      description: 'Onboarding Success Done Button',
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.doneButton);
        await el.waitForDisplayed({ timeout: 10000 });
      },
    });
  }
}

export default new OnboardingSuccessView();
