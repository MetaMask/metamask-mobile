import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnBoardingSelectors } from '../../selectors/swaps/OnBoarding.selectors';
import { type AppiumElement } from '../../framework';

class Onboarding {
  get startSwappingButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(OnBoardingSelectors.START_SWAPPING);
  }

  async tapStartSwapping(): Promise<void> {
    await Gestures.waitAndTap(this.startSwappingButton, {
      elemDescription: 'Start Swapping Button in Onboarding',
    });
  }
}

export default new Onboarding();
