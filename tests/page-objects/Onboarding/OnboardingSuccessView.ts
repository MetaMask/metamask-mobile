import { OnboardingSuccessSelectorIDs } from '../../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';

import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

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
          {
            exact: true,
          },
        ),
    });
  }

  async tapDone(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.doneButton, {
      description: 'Onboarding Success Done Button',
    });
  }
}

export default new OnboardingSuccessView();
