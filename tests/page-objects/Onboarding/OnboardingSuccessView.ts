import { OnboardingSuccessSelectorIDs } from '../../../app/components/Views/OnboardingSuccess/OnboardingSuccess.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class OnboardingSuccessView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingSuccessSelectorIDs.CONTAINER_ID);
  }

  get doneButton(): EncapsulatedElementType {
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
