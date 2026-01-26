import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';

class StakeConfirmationView {
  get confirmButton(): DetoxElement {
    return Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Stake Confirmation View',
    });
  }
}

export default new StakeConfirmationView();
