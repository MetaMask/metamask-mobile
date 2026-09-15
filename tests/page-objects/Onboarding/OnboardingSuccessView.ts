import { OnboardingSuccessSelectorIDs } from '../../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class OnboardingSuccessView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  get doneButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone(): Promise<void> {
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Onboarding Success Done Button',
      timeout: 15_000,
    });
  }
}

export default new OnboardingSuccessView();
