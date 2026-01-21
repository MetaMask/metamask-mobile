import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { GetStartedSelectors } from '../../locators/Ramps/GetStarted.selectors';

class SellGetStartedView {
  get getStartedButton(): DetoxElement {
    return Matchers.getElementByText(GetStartedSelectors.GET_STARTED);
  }

  async tapGetStartedButton(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Get Started Button in Sell Get Started View',
    });
  }
}

export default new SellGetStartedView();
