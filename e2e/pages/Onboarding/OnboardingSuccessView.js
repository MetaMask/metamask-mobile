import { OnboardingSuccessSelectorIDs } from '../../selectors/Onboarding/OnboardingSuccess.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

class OnboardingSuccessView {
  get container() {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  static async isVisible() {
    if (!device.getPlatform() === 'android') {
      // Check that we are on the onboarding success screen
      await TestHelpers.checkIfExists(
        OnboardingSuccessSelectorIDs.CONTAINER_ID,
      );
    }
  }

  get doneButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(OnboardingSuccessSelectorIDs.DONE_BUTTON)
      : Matchers.getElementByID(OnboardingSuccessSelectorIDs.DONE_BUTTON);
  }

  async tapDone() {
    await Gestures.waitAndTap(this.doneButton);
  }
}

export default new OnboardingSuccessView();
