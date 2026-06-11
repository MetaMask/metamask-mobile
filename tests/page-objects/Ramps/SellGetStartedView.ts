import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { GetStartedSelectors } from '../../selectors/Ramps/GetStarted.selectors';
import { EncapsulatedElementType } from '../../framework';

class SellGetStartedView {
  get getStartedButton(): EncapsulatedElementType {
    return Matchers.getElementByText(GetStartedSelectors.GET_STARTED);
  }

  async tapGetStartedButton(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Get Started Button in Sell Get Started View',
    });
  }
}

export default new SellGetStartedView();
