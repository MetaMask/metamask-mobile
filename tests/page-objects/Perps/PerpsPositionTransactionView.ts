import { PerpsTransactionSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

class PerpsPositionTransactionView {
  get transactionView(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.POSITION_TRANSACTION_VIEW,
    );
  }

  get assetHero(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO,
    );
  }

  get blockExplorerButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.transactionView, {
      description: 'Perps position transaction view should be visible',
    });
  }

  async tapBlockExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.blockExplorerButton, {
      elemDescription: 'View Perps position transaction on block explorer',
    });
  }
}

export default new PerpsPositionTransactionView();
