import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { OnBoardingSelectors } from '../../selectors/swaps/OnBoarding.selectors';

class Onboarding {
  get startSwappingButton(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(OnBoardingSelectors.START_SWAPPING);
  }

  async tapStartSwapping(): Promise<void> {
    await Gestures.waitAndTap(this.startSwappingButton);
  }
}

export default new Onboarding();
