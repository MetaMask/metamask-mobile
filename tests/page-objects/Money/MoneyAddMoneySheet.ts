import { MoneyAddMoneySheetTestIds } from '../../../app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type EncapsulatedElementType,
} from '../../framework';

/** Page object for the Money Home "Add money" bottom sheet. */
class MoneyAddMoneySheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyAddMoneySheetTestIds.CONTAINER);
  }

  get convertCryptoOption(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    );
  }

  get depositFundsOption(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    );
  }

  get moveMusdOption(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION);
  }

  get bankAccountRow(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW);
  }

  get receiveExternalRow(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW,
    );
  }

  async expectVisible(): Promise<void> {
    // The design-system BottomSheet container testID is not reliably surfaced as
    // an iOS accessibility id, but its option rows are; assert on an always-present
    // option to confirm the sheet opened.
    await Assertions.expectElementToBeVisible(this.convertCryptoOption, {
      description: 'Money add-money sheet should be visible',
      timeout: 15000,
    });
  }

  async tapConvertCrypto(): Promise<void> {
    await Gestures.waitAndTap(this.convertCryptoOption, {
      elemDescription: 'Add money sheet - Convert crypto option',
    });
  }

  async tapDepositFunds(): Promise<void> {
    await Gestures.waitAndTap(this.depositFundsOption, {
      elemDescription: 'Add money sheet - Deposit funds option',
    });
  }

  async tapMoveMusd(): Promise<void> {
    await Gestures.waitAndTap(this.moveMusdOption, {
      elemDescription: 'Add money sheet - Move/Add mUSD option',
    });
  }
}

export default new MoneyAddMoneySheet();
