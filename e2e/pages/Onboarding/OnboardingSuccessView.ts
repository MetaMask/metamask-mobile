import { OnboardingSuccessSelectorIDs } from '../../selectors/Onboarding/OnboardingSuccess.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

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
