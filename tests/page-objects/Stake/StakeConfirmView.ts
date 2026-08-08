import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';
import { EncapsulatedElementType } from '../../framework';

class StakeConfirmationView {
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Stake Confirmation View',
    });
  }
}

export default new StakeConfirmationView();
