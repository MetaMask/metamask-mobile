import Matchers from '../../framework/Matchers';
import { UnifiedTransactionsViewSelectorsIDs } from '../../../app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.testIds';
import Gestures from '../../framework/Gestures';

class UnifiedTransactionsView {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      UnifiedTransactionsViewSelectorsIDs.CONTAINER,
    );
  }

  async swipeDown(): Promise<void> {
    await Gestures.swipe(this.container, 'down', {
      speed: 'slow',
      percentage: 0.5,
    });
  }
}

export default new UnifiedTransactionsView();
