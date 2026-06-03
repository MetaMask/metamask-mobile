import Matchers from '../../framework/Matchers';
import { UnifiedTransactionsViewSelectorsIDs } from '../../../app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class UnifiedTransactionsView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(UnifiedTransactionsViewSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          UnifiedTransactionsViewSelectorsIDs.CONTAINER,
        ),
    });
  }

  async swipeDown(): Promise<void> {
    await UnifiedGestures.swipe(this.container, 'down', {
      speed: 'slow',
      percentage: 0.5,
    });
  }
}

export default new UnifiedTransactionsView();
