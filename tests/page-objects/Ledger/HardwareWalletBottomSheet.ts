import Matchers from '../../framework/Matchers';
import { HardwareWalletBottomSheetSelectorsIDs } from '../../selectors/Ledger/Ledger.selectors';

class HardwareWalletBottomSheet {
  get container() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get connectingContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONNECTING_CONTENT,
    );
  }

  get awaitingConfirmationContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.AWAITING_CONFIRMATION_CONTENT,
    );
  }

  get successContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.SUCCESS_CONTENT,
    );
  }

  get errorContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.ERROR_CONTENT,
    );
  }
}

export default new HardwareWalletBottomSheet();
