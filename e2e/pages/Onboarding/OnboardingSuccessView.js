import { OnboardingSuccessSelectorIDs } from '../../selectors/Onboarding/OnboardingSuccess.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class OnboardingSuccessView {
  get doneButton() {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone() {
    await Gestures.waitAndTap(this.doneButton);
  }
}

export default new OnboardingSuccessView();
