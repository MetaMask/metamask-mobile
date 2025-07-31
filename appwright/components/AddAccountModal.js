import { AddAccountBottomSheetSelectorsIDs } from '../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import { CommonScreen } from '../screens/CommonScreen';

export class AddAccountModal extends CommonScreen {
  get newAccountButton() {
    return AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON;
  }

  get importAccountButton() {
    return AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON;
  }

  async tapOnNewAccountButton() {
    await this.tapOnElement(this.newAccountButton);
  }

  async tapOnImportAccountButton() {
    await this.tapOnElement(this.importAccountButton);
  }
}
