import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';

class StakeConfirmationView {
  get confirmButton(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new StakeConfirmationView();
