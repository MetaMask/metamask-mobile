import { PerpsTransactionSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

class PerpsOrderTransactionView {
  get transactionView(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.ORDER_TRANSACTION_VIEW,
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

  get triggerPriceRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.TRIGGER_PRICE_ROW,
    );
  }

  get limitPriceRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.LIMIT_PRICE_ROW,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.transactionView, {
      description: 'Perps order transaction view should be visible',
    });
  }

  async tapBlockExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.blockExplorerButton, {
      elemDescription: 'View Perps order transaction on block explorer',
    });
  }
}

export default new PerpsOrderTransactionView();
