import { CardTransactionDetailsTestIds } from '../../../app/components/UI/Card/Views/CardTransactionDetails/CardTransactionDetails.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

class CardTransactionDetailsView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardTransactionDetailsTestIds.CONTAINER);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardTransactionDetailsTestIds.BACK_BUTTON);
  }

  get explorerButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CardTransactionDetailsTestIds.EXPLORER_BUTTON,
    );
  }

  get reportButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardTransactionDetailsTestIds.REPORT_BUTTON);
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Card transaction details view should be visible',
    });
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Card transaction details back button',
    });
  }

  async tapExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.explorerButton, {
      elemDescription: 'Card transaction details explorer button',
    });
  }

  async tapReportButton(): Promise<void> {
    await Gestures.waitAndTap(this.reportButton, {
      elemDescription: 'Card transaction details report button',
    });
  }
}

export default new CardTransactionDetailsView();
