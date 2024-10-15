import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { GetStartedSelectors } from '../../selectors/Ramps/GetStarted.selectors';

class BuyGetStartedView {
  get getStartedButton() {
    return Matchers.getElementByText(GetStartedSelectors.GET_STARTED);
  }

  async tapGetStartedButton() {
    await Gestures.waitAndTap(this.getStartedButton);
  }
}

export default new BuyGetStartedView();
