import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { OnBoardingSelectors } from '../../selectors/swaps/OnBoarding.selectors';

class Onboarding {
  get startSwappingButton(): DetoxElement {
    return Matchers.getElementByText(OnBoardingSelectors.START_SWAPPING);
  }

  async tapStartSwapping(): Promise<void> {
    await Gestures.waitAndTap(this.startSwappingButton, {
      elemDescription: 'Start Swapping Button in Onboarding',
    });
  }
}

export default new Onboarding();
