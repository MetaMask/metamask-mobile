import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
  TransactionDetailsSelectorIDs,
} from '../../../app/components/Views/confirmations/components/activity/TransactionDetailsModal.testIds';
import Matchers from '../../framework/Matchers';
import { Assertions, logger } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class TransactionDetailsModal {
  get closeIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.CLOSE_ICON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionDetailsModalSelectorsIDs.CLOSE_ICON,
        ),
    });
  }

  get networkFee(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsSelectorIDs.NETWORK_FEE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionDetailsSelectorIDs.NETWORK_FEE,
        ),
    });
  }

  get paidWithSymbol(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL,
        ),
    });
  }

  get status(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsSelectorIDs.STATUS),
      appium: () =>
        PlaywrightMatchers.getElementById(TransactionDetailsSelectorIDs.STATUS),
    });
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionDetailsModalSelectorsIDs.TITLE,
        ),
    });
  }

  get total(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TransactionDetailsSelectorIDs.TOTAL),
      appium: () =>
        PlaywrightMatchers.getElementById(TransactionDetailsSelectorIDs.TOTAL),
    });
  }

  get transactionFee(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionDetailsSelectorIDs.TRANSACTION_FEE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionDetailsSelectorIDs.TRANSACTION_FEE,
        ),
    });
  }

  generateExpectedTitle(sourceToken: string, destinationToken: string): string {
    let title = TransactionDetailsModalSelectorsText.TITLE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async tapOnCloseIcon(): Promise<void> {
    try {
      await UnifiedGestures.waitAndTap(this.closeIcon);
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
