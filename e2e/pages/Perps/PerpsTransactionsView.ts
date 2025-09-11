import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { PerpsTransactionSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

class PerpsTransactionsView {
  // Tabs use visible text from i18n via PerpsTransactionsView
  get tradesTab(): DetoxElement {
    return Matchers.getElementByText(/Trades/i);
  }

  get ordersTab(): DetoxElement {
    return Matchers.getElementByText(/Orders/i);
  }

  get fundingTab(): DetoxElement {
    return Matchers.getElementByText(/Funding/i);
  }

  get anyTransactionItem(): DetoxElement {
    return Matchers.getElementByID(PerpsTransactionSelectorsIDs.TRANSACTION_ITEM);
  }

  async openTrades(): Promise<void> {
    await Gestures.waitAndTap(this.tradesTab, {
      elemDescription: 'Open Trades tab',
    });
    await Assertions.expectElementToBeVisible(this.tradesTab, {
      description: 'Trades tab visible',
    });
  }

  async openOrders(): Promise<void> {
    await Gestures.waitAndTap(this.ordersTab, {
      elemDescription: 'Open Orders tab',
    });
    await Assertions.expectElementToBeVisible(this.ordersTab, {
      description: 'Orders tab visible',
    });
  }

  async openFunding(): Promise<void> {
    await Gestures.waitAndTap(this.fundingTab, {
      elemDescription: 'Open Funding tab',
    });
    await Assertions.expectElementToBeVisible(this.fundingTab, {
      description: 'Funding tab visible',
    });
  }

  async expectAnyItemVisible(description: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.anyTransactionItem, {
      description,
      timeout: 15000,
    });
  }
}

export default new PerpsTransactionsView();


