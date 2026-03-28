import { strings } from '../../../locales/i18n';
import Matchers from '../../framework/Matchers';
import { Assertions } from '../../framework';

class MultichainTransactionDetailsSheet {
  get networkFeeLabel(): DetoxElement {
    return Matchers.getElementByText(strings('transactions.network_fee'));
  }

  get viewDetailsButton(): DetoxElement {
    return Matchers.getElementByText(strings('networks.view_details'));
  }

  transactionStatus(transactionId: string): DetoxElement {
    return Matchers.getElementByID(`transaction-status-${transactionId}`);
  }

  async verifySheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.networkFeeLabel, {
      timeout: 20000,
      description: 'Multichain transaction details should show network fee',
    });
    await Assertions.expectElementToBeVisible(this.viewDetailsButton, {
      timeout: 20000,
      description: 'Multichain transaction details should show view details button',
    });
  }

  async verifyStatus(transactionId: string, statusText: string): Promise<void> {
    await Assertions.expectElementToHaveText(
      this.transactionStatus(transactionId),
      statusText,
      {
        timeout: 10000,
        description: `Multichain transaction ${transactionId} should show status "${statusText}"`,
      },
    );
  }
}

export default new MultichainTransactionDetailsSheet();
