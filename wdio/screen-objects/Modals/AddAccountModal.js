import Selectors from '../../helpers/Selectors';
import { AddAccountBottomSheetSelectorsIDs } from '../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import Gestures from '../../helpers/Gestures';

class AddAccountModal {
  get newAccountButton() {
    return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON);
  }

  get importAccountButton() {
    return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON);
  }

  async tapNewAccountButton() {
    await Gestures.waitAndTap(this.newAccountButton);
    const newAccountButton = await this.newAccountButton;
    await newAccountButton.waitForExist({ reverse: true });
  }

  async tapImportAccountButton() {
    await Gestures.waitAndTap(this.importAccountButton);
  }
}

export default new AddAccountModal();
