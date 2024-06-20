import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

import {
  EditGasViewSelectorsText,
  EditGasViewSelectorsIDs,
} from '../../selectors/EditGasView.selectors.js';
import {
  TransactionConfirmViewSelectorsText,
  TransactionConfirmViewSelectorsIDs,
} from '../../selectors/TransactionConfirmView.selectors.js';

class TransactionConfirmationView {
  get confirmButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        )
      : Matchers.getElementByLabel(
          TransactionConfirmViewSelectorsIDs.CONFIRM_TRANSACTION_BUTTON_ID,
        );
  }

  get cancelButton() {
    return Matchers.getElementByText(
      TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
    );
  }

  get maxGasFee() {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.MAX_PRIORITY_FEE_INPUT_TEST_ID,
    );
  }

  get editPriorityFeeSheetContainer() {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.EDIT_PRIORITY_SCREEN_TEST_ID,
    );
  }

  get transactionAmount() {
    return Matchers.getElementByText(
      TransactionConfirmViewSelectorsIDs.COMFIRM_TXN_AMOUNT,
    );
  }

  get estimatedGasLink() {
    return Matchers.getElementByID(
      EditGasViewSelectorsIDs.ESTIMATED_FEE_TEST_ID,
    );
  }

  get transactionViewContainer() {
    return Matchers.getElementByID(
      TransactionConfirmViewSelectorsIDs.TRANSACTION_VIEW_CONTAINER_ID,
    );
  }
  get LowPriorityText() {
    return Matchers.getElementByText(EditGasViewSelectorsText.LOW);
  }
  get MarketPriorityText() {
    return Matchers.getElementByText(EditGasViewSelectorsText.MARKET);
  }
  get AggressivePriorityText() {
    return Matchers.getElementByText(EditGasViewSelectorsText.AGGRESSIVE);
  }
  get EditPrioritySaveButtonText() {
    return Matchers.getElementByText(EditGasViewSelectorsText.SAVE_BUTTON);
  }
  get EditPriorityAdvancedOptionsText() {
    return Matchers.getElementByText(EditGasViewSelectorsText.ADVANCE_OPTIONS);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(await this.confirmButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapEstimatedGasLink() {
    await Gestures.waitAndTap(this.estimatedGasLink);
  }

  async tapLowPriorityGasOption() {
    await Gestures.waitAndTap(this.LowPriorityText);
  }
  async tapMarketPriorityGasOption() {
    await Gestures.waitAndTap(this.MarketPriorityText);
  }
  async tapAggressivePriorityGasOption() {
    await Gestures.waitAndTap(this.AggressivePriorityText);
  }

  async tapMaxPriorityFeeSaveButton() {
    await Gestures.waitAndTap(this.EditPrioritySaveButtonText);
  }
  async tapAdvancedOptionsPriorityGasOption() {
    await Gestures.waitAndTap(this.EditPriorityAdvancedOptionsText);
  }
}

export default new TransactionConfirmationView();
