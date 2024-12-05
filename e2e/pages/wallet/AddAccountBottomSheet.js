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

  async tapImportAccount() {
    await Gestures.waitAndTap(this.importAccountButton);
  }
  async tapCreateAccount() {
    await Gestures.waitAndTap(this.createAccountButton);
  }
}

export default new AddAccountBottomSheet();
