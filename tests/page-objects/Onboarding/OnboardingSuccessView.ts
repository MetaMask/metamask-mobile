import { OnboardingSuccessSelectorIDs } from '../../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class OnboardingSuccessView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  get doneButton(): DetoxElement {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone(): Promise<void> {
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Onboarding Success Done Button',
    });
  }
}

export default new OnboardingSuccessView();
