import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { StakeConfirmViewSelectors } from '../../locators/Stake/StakeConfirmView.selectors.js';

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
