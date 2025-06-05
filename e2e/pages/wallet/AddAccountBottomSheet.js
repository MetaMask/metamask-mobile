import { AddAccountBottomSheetSelectorsIDs } from '../../selectors/wallet/AddAccountBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AddAccountBottomSheet {
  get importAccountButton() {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
  }

  get createAccountButton() {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON,
    );
  }

  get createSolanaAccountButton() {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
    );
  }

  get importSrpButton() {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
    );
  }

  async tapImportAccount() {
    await Gestures.waitAndTap(this.importAccountButton);
  }

  async tapCreateAccount() {
    await Gestures.waitAndTap(this.createAccountButton);
  }

  async tapImportSrp() {
    await Gestures.waitAndTap(this.importSrpButton);
  }

  async tapAddSolanaAccount() {
    await Gestures.waitAndTap(this.createSolanaAccountButton);
    if (device.getPlatform() === 'android') {
      // on android, keyboard is open and overlays the bottom sheet, so we need to close it
      await device.pressBack();
    }
  }
}

export default new AddAccountBottomSheet();
