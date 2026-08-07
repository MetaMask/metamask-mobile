import { PayWithBottomSheetIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  encapsulated,
  type EncapsulatedElementType,
} from '../../framework';

const rowGetter = (testID: string): EncapsulatedElementType =>
  encapsulated({
    detox: () => Matchers.getElementByID(testID),
    appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
  });

/**
 * Page object for the "pay with" bottom sheet opened from the transaction pay
 * confirmation. Each method selects one payment option; "Other assets" opens the
 * secondary all-assets picker handled by PayWithModalTokenPicker.
 */
class PayWithModal {
  get preferredTokenRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.CRYPTO_PREFERRED_TOKEN_ROW);
  }

  get noFeeTokenRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.CRYPTO_NO_FEE_TOKEN_ROW);
  }

  get otherAssetsRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.CRYPTO_OTHER_ASSETS_ROW);
  }

  get moneyAccountRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.MONEY_ACCOUNT_ROW);
  }

  get perpsBalanceRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.PERPS_BALANCE_ROW);
  }

  get predictBalanceRow(): EncapsulatedElementType {
    return rowGetter(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW);
  }

  async tapPreferredPayToken(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.preferredTokenRow, {
      description: 'Preferred pay token row',
    });
  }

  async tapNoFeeToken(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.noFeeTokenRow, {
      description: 'No-fee pay token row',
    });
  }

  async tapOtherAssets(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.otherAssetsRow, {
      description: 'Other assets row',
    });
  }

  async tapMoneyAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.moneyAccountRow, {
      description: 'Money account row',
    });
  }

  async tapPerpsBalance(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.perpsBalanceRow, {
      description: 'Perps balance row',
    });
  }

  async tapPredictBalance(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.predictBalanceRow, {
      description: 'Predict balance row',
    });
  }
}

export default new PayWithModal();
