import { MoneyApiActivityDetailsViewTestIds } from '../../../app/components/UI/Money/Views/MoneyApiActivityDetailsView/MoneyApiActivityDetailsView.testIds';
import { CardTransactionDetailsTestIds } from '../../../app/components/UI/Card/Views/CardTransactionDetails/CardTransactionDetails.testIds';
import {
  Gestures,
  Matchers,
  Utilities,
  type AppiumElement,
} from '../../framework';

class MoneyApiActivityDetailsView {
  get apiActivityContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      MoneyApiActivityDetailsViewTestIds.CONTAINER,
    );
  }

  get cardActivityContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardTransactionDetailsTestIds.CONTAINER);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      MoneyApiActivityDetailsViewTestIds.BACK_BUTTON,
    );
  }

  get cardExplorerButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      MoneyApiActivityDetailsViewTestIds.EXPLORER_BUTTON,
    );
  }

  get bankTransferExplorerButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      MoneyApiActivityDetailsViewTestIds.BANK_TRANSFER_EXPLORER_BUTTON,
    );
  }

  async expectVisible(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const apiActivityVisible = await Utilities.isElementVisible(
          this.apiActivityContainer,
          500,
        );
        const cardActivityVisible = await Utilities.isElementVisible(
          this.cardActivityContainer,
          500,
        );
        if (!apiActivityVisible && !cardActivityVisible) {
          throw new Error('Money activity details view is not visible');
        }
      },
      {
        description: 'Money activity details view should be visible',
        timeout: 20_000,
        interval: 500,
      },
    );
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Money API activity details back button',
    });
  }

  async tapCardExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.cardExplorerButton, {
      elemDescription: 'Money API activity details explorer button',
    });
  }

  async tapBankTransferExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.bankTransferExplorerButton, {
      elemDescription: 'Money bank transfer explorer button',
    });
  }
}

export default new MoneyApiActivityDetailsView();
