import Matchers from '../../framework/Matchers';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class StakeConfirmationView {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM),
      appium: () =>
        PlaywrightMatchers.getElementByText(StakeConfirmViewSelectors.CONFIRM),
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Stake Confirmation View',
    });
  }
}

export default new StakeConfirmationView();
