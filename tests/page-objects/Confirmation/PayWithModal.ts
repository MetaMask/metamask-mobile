import { PayWithBottomSheetIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { Gestures, Matchers, type AppiumElement } from '../../framework';

/**
 * Page object for the "pay with" bottom sheet opened from the transaction pay
 * confirmation. Each method selects one payment option; "Other assets" opens the
 * secondary all-assets picker handled by PayWithModalTokenPicker.
 */
class PayWithModal {
  get preferredTokenRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PayWithBottomSheetIDs.CRYPTO_PREFERRED_TOKEN_ROW,
    );
  }

  get noFeeTokenRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PayWithBottomSheetIDs.CRYPTO_NO_FEE_TOKEN_ROW,
    );
  }

  get otherAssetsRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PayWithBottomSheetIDs.CRYPTO_OTHER_ASSETS_ROW,
    );
  }

  get moneyAccountRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(PayWithBottomSheetIDs.MONEY_ACCOUNT_ROW);
  }

  get perpsBalanceRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(PayWithBottomSheetIDs.PERPS_BALANCE_ROW);
  }

  get predictBalanceRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(PayWithBottomSheetIDs.PREDICT_BALANCE_ROW);
  }

  async tapPreferredPayToken(): Promise<void> {
    await Gestures.waitAndTap(this.preferredTokenRow, {
      elemDescription: 'Preferred pay token row',
    });
  }

  async tapNoFeeToken(): Promise<void> {
    await Gestures.waitAndTap(this.noFeeTokenRow, {
      elemDescription: 'No-fee pay token row',
    });
  }

  async tapOtherAssets(): Promise<void> {
    await Gestures.waitAndTap(this.otherAssetsRow, {
      elemDescription: 'Other assets row',
    });
  }

  async tapMoneyAccount(): Promise<void> {
    await Gestures.waitAndTap(this.moneyAccountRow, {
      elemDescription: 'Money account row',
    });
  }

  async tapPerpsBalance(): Promise<void> {
    await Gestures.waitAndTap(this.perpsBalanceRow, {
      elemDescription: 'Perps balance row',
    });
  }

  async tapPredictBalance(): Promise<void> {
    await Gestures.waitAndTap(this.predictBalanceRow, {
      elemDescription: 'Predict balance row',
    });
  }
}

export default new PayWithModal();
