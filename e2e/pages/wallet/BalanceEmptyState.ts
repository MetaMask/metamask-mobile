import { BalanceEmptyStateSelectorsIDs } from '../../selectors/wallet/BalanceEmptyState.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class BalanceEmptyState {
  get container(): DetoxElement {
    return Matchers.getElementByID(BalanceEmptyStateSelectorsIDs.CONTAINER);
  }

  get image(): DetoxElement {
    return Matchers.getElementByID(BalanceEmptyStateSelectorsIDs.IMAGE);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(BalanceEmptyStateSelectorsIDs.TITLE);
  }

  get subtitle(): DetoxElement {
    return Matchers.getElementByID(BalanceEmptyStateSelectorsIDs.SUBTITLE);
  }

  get actionButton(): DetoxElement {
    return Matchers.getElementByID(BalanceEmptyStateSelectorsIDs.ACTION_BUTTON);
  }

  async tapActionButton(): Promise<void> {
    await Gestures.waitAndTap(this.actionButton, {
      elemDescription: 'Balance Empty State Action Button',
    });
  }
}

export default new BalanceEmptyState();
