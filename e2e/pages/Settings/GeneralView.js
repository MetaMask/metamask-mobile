import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { GeneralViewSelectorIDs } from '../../selectors/GeneralView.selectors';

class GeneralView {
  get scrollView() {
    return Matchers.getElementByID(GeneralViewSelectorIDs.SCROLL_ELEMENT);
  }

  get ScrollViewIdentifier() {
    return Matchers.getIdentifier(GeneralViewSelectorIDs.SCROLL_ELEMENT);
  }

  get zeroBalanceToggle() {
    return Matchers.getElementByID(GeneralViewSelectorIDs.ZERO_BALANCE_TOGGLE);
  }

  async scrollToZeroBalanceToggle() {
    await Gestures.scrollToElement(
      this.zeroBalanceToggle,
      this.ScrollViewIdentifier,
    );
  }

  async tapZeroBalanceToggle() {
    await Gestures.waitAndTap(this.zeroBalanceToggle);
  }
}
export default new GeneralView();
