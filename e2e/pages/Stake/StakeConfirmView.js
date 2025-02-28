import Gestures from '../../utils/Gestures.js';
import Matchers from '../../utils/Matchers.js';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';

class StakeConfirmationView {
  get confirmButton() {
    return Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new StakeConfirmationView();
