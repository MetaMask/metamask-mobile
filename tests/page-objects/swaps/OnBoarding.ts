import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
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
