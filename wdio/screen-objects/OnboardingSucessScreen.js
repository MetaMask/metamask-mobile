import { OnboardingSuccessSelectorIDs } from '../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';

class OnboardingSuccessView {

  get doneButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone() {
    await Gestures.waitAndTap(this.doneButton);
  }
}

export default new OnboardingSuccessView();
