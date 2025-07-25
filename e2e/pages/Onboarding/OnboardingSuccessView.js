import { OnboardingSuccessSelectorIDs } from '../../selectors/Onboarding/OnboardingSuccess.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class OnboardingSuccessView {
  get container() {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  get doneButton() {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone() {
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Onboarding Success Done Button',
    });
  }
}

export default new OnboardingSuccessView();
