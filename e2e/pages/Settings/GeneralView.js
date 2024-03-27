import { GeneralViewSelectorsIDs } from '../../selectors/Settings/GeneralView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';
class GeneralView {
  get hideTokenBalanceToggle() {
    return Matchers.getElementByID(
      GeneralViewSelectorsIDs.HIDE_TOKENS_WITHOUT_BALANCE_TOGGLE,
    );
  }

  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      GeneralViewSelectorsIDs.GENERAL_SCREEN_SCROLL_VIEW,
    );
  }

  async toggleHideZeroBalance() {
    await Gestures.waitAndTap(this.hideTokenBalanceToggle);
  }

  async scrollToHideTokensToggle() {
    await Gestures.scrollToElement(
      this.hideTokenBalanceToggle,
      this.scrollViewIdentifier,
    );
  }

  async scrollToBottomOfView() {
    await TestHelpers.swipeByText('Primary Currency', 'up', 'fast', 0.9);
  }
}
export default new GeneralView();
