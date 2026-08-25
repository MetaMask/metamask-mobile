import { MoneyTransferSheetTestIds } from '../../../app/components/UI/Money/components/MoneyTransferSheet/MoneyTransferSheet.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type EncapsulatedElementType,
} from '../../framework';

class MoneyTransferSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyTransferSheetTestIds.CONTAINER);
  }

  get betweenAccountsOption(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION,
    );
  }

  get perpsAccountOption(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION,
    );
  }

  get predictionsAccountOption(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
    );
  }

  get sendExternalRow(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW);
  }

  get withdrawToBankRow(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.betweenAccountsOption, {
      description: 'Money transfer sheet should be visible',
      timeout: 15_000,
    });
  }

  async tapBetweenAccounts(): Promise<void> {
    await Gestures.waitAndTap(this.betweenAccountsOption, {
      elemDescription: 'Transfer sheet - Between accounts option',
    });
  }

  async tapPerpsAccount(): Promise<void> {
    await Gestures.waitAndTap(this.perpsAccountOption, {
      elemDescription: 'Transfer sheet - Perps account option',
    });
  }

  async tapPredictionsAccount(): Promise<void> {
    await Gestures.waitAndTap(this.predictionsAccountOption, {
      elemDescription: 'Transfer sheet - Predictions account option',
    });
  }
}

export default new MoneyTransferSheet();
