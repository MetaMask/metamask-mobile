import { MoneyActivityItemTestIds } from '../../../app/components/UI/Money/components/MoneyActivityItem/MoneyActivityItem.testIds';
import { MoneyActivityViewTestIds } from '../../../app/components/UI/Money/Views/MoneyActivityView/MoneyActivityView.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

class MoneyActivityView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.CONTAINER);
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.TITLE);
  }

  get allFilter(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.FILTER_ALL);
  }

  get depositsFilter(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.FILTER_DEPOSITS);
  }

  get transfersFilter(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.FILTER_TRANSFERS);
  }

  get purchasesFilter(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyActivityViewTestIds.FILTER_PURCHASES);
  }

  async getTransactionRow(transactionId: string): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${MoneyActivityItemTestIds.ROW}-${transactionId}`,
    );
  }

  async getAccountsActivityRow(activityHash: string): Promise<AppiumElement> {
    return this.getTransactionRow(activityHash);
  }

  async getCardTransactionRow(transactionId: string): Promise<AppiumElement> {
    return this.getTransactionRow(transactionId);
  }

  async getBankTransferRow(activityId: string): Promise<AppiumElement> {
    return this.getTransactionRow(activityId);
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Money activity view should be visible',
    });
  }

  async tapFilter(
    filter: 'all' | 'deposits' | 'transfers' | 'purchases',
  ): Promise<void> {
    const filterElements = {
      all: this.allFilter,
      deposits: this.depositsFilter,
      transfers: this.transfersFilter,
      purchases: this.purchasesFilter,
    };

    await Gestures.waitAndTap(filterElements[filter], {
      elemDescription: `Money activity ${filter} filter`,
    });
  }

  async tapTransaction(transactionId: string): Promise<void> {
    await Gestures.waitAndTap(this.getTransactionRow(transactionId), {
      elemDescription: `Money transaction row ${transactionId}`,
    });
  }
}

export default new MoneyActivityView();
