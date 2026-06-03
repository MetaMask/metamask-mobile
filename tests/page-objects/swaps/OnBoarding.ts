import Matchers from '../../framework/Matchers';
import { OnBoardingSelectors } from '../../selectors/swaps/OnBoarding.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class Onboarding {
  get startSwappingButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(OnBoardingSelectors.START_SWAPPING),
      appium: () =>
        PlaywrightMatchers.getElementByText(OnBoardingSelectors.START_SWAPPING),
    });
  }

  async tapStartSwapping(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.startSwappingButton, {
      elemDescription: 'Start Swapping Button in Onboarding',
    });
  }
}

export default new Onboarding();
