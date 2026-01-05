import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
  TransactionDetailsSelectorIDs,
} from '../../selectors/Transactions/TransactionDetailsModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Assertions, logger } from '../../framework';

class TransactionDetailsModal {
  get closeIcon(): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsModalSelectorsIDs.CLOSE_ICON,
    );
  }

  get networkFee(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.NETWORK_FEE);
  }

  get paidWithSymbol(): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL,
    );
  }

  get status(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.STATUS);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.TITLE);
  }

  get total(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.TOTAL);
  }

  get transactionFee(): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsSelectorIDs.TRANSACTION_FEE,
    );
  }

  generateExpectedTitle(sourceToken: string, destinationToken: string): string {
    let title = TransactionDetailsModalSelectorsText.TITLE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async tapOnCloseIcon(): Promise<void> {
    try {
      await Gestures.waitAndTap(this.closeIcon);
    } catch {
      // Handle error
      logger.warn(
        'TransactionDetailsModal: tapOnCloseIcon - failed, skipping tap.',
      );
    }
  }

  async verifyNetworkFee(fee: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.networkFee, fee, {
      description: 'Network fee should be correct',
    });
  }

  async verifyPaidWithSymbol(symbol: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.paidWithSymbol, symbol, {
      description: 'Paid with symbol should be correct',
    });
  }

  async verifyStatus(status: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.status, status, {
      description: 'Status should be correct',
    });
  }

  async verifyTotal(total: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.total, total, {
      description: 'Total should be correct',
    });
  }

  async verifyTransactionFee(fee: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.transactionFee, fee, {
      description: 'Transaction fee should be correct',
    });
  }
}

export default new TransactionDetailsModal();
