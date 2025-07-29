import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { ConfirmationTopSheetSelectorsIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import {
  EditGasViewSelectorsText,
  EditGasViewSelectorsIDs,
} from '../../selectors/SendFlow/EditGasView.selectors';
import {
  TransactionConfirmViewSelectorsIDs,
  TransactionConfirmViewSelectorsText,
} from '../../selectors/SendFlow/TransactionConfirmView.selectors';

class TransactionConfirmationView {
  get confirmButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        )
      : Matchers.getElementByLabel(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByText(
      TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
    );
  }

  get maxGasFee(): DetoxElement {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.MAX_PRIORITY_FEE_INPUT_TEST_ID,
    );
  }

  get editPriorityFeeSheetContainer(): DetoxElement {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.EDIT_PRIORITY_SCREEN_TEST_ID,
    );
  }

  get transactionAmount(): DetoxElement {
    return Matchers.getElementByID(
      TransactionConfirmViewSelectorsIDs.CONFIRM_TXN_AMOUNT,
    );
  }

  get estimatedGasLink(): DetoxElement {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID,
    );
  }

  get transactionViewContainer(): DetoxElement {
    return Matchers.getElementByID(
      TransactionConfirmViewSelectorsIDs.TRANSACTION_VIEW_CONTAINER_ID,
    );
  }
  get LowPriorityText(): DetoxElement {
    return Matchers.getElementByText(EditGasViewSelectorsText.LOW);
  }
  get MarketPriorityText(): DetoxElement {
    return Matchers.getElementByText(EditGasViewSelectorsText.MARKET);
  }
  get AggressivePriorityText(): DetoxElement {
    return Matchers.getElementByText(EditGasViewSelectorsText.AGGRESSIVE);
  }
  get EditPrioritySaveButtonText(): DetoxElement {
    return Matchers.getElementByText(EditGasViewSelectorsText.SAVE_BUTTON);
  }
  get EditPriorityAdvancedOptionsText(): DetoxElement {
    return Matchers.getElementByText(EditGasViewSelectorsText.ADVANCE_OPTIONS);
  }

  get editPriorityLegacyModal(): DetoxElement {
    return Matchers.getElementByID(EditGasViewSelectorsIDs.LEGACY_CONTAINER);
  }

  get securityAlertBanner(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
    );
  }

  get securityAlertResponseFailedBanner(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
    );
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Transaction Confirmation View',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Transaction Confirmation View',
    });
  }

  async tapEstimatedGasLink(): Promise<void> {
    await Gestures.swipe(this.transactionAmount, 'up', {
      speed: 'fast',
    });
    await Gestures.tap(this.estimatedGasLink, {
      elemDescription: 'Estimated Gas Link in Transaction Confirmation View',
      checkStability: true,
    });
  }

  async tapLowPriorityGasOption(): Promise<void> {
    await Gestures.waitAndTap(this.LowPriorityText, {
      elemDescription:
        'Low Priority Gas Option in Transaction Confirmation View',
    });
  }
  async tapMarketPriorityGasOption(): Promise<void> {
    await Gestures.waitAndTap(this.MarketPriorityText, {
      elemDescription:
        'Market Priority Gas Option in Transaction Confirmation View',
    });
  }
  async tapAggressivePriorityGasOption(): Promise<void> {
    await Gestures.waitAndTap(this.AggressivePriorityText, {
      elemDescription:
        'Aggressive Priority Gas Option in Transaction Confirmation View',
    });
  }

  async tapMaxPriorityFeeSaveButton(): Promise<void> {
    await Gestures.waitAndTap(this.EditPrioritySaveButtonText, {
      elemDescription:
        'Edit Priority Save Button in Transaction Confirmation View',
    });
  }
  async tapAdvancedOptionsPriorityGasOption(): Promise<void> {
    await Gestures.waitAndTap(this.EditPriorityAdvancedOptionsText, {
      elemDescription: 'Advanced Options Priority Gas Option',
    });
  }
}

export default new TransactionConfirmationView();
