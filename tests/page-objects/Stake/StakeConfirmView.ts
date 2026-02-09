import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';
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
