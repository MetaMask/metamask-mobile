import Matchers from '../../framework/Matchers';
import { GetStartedSelectors } from '../../selectors/Ramps/GetStarted.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SellGetStartedView {
  get getStartedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(GetStartedSelectors.GET_STARTED),
      appium: () =>
        PlaywrightMatchers.getElementByText(GetStartedSelectors.GET_STARTED),
    });
  }

  async tapGetStartedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Get Started Button in Sell Get Started View',
    });
  }
}

export default new SellGetStartedView();
