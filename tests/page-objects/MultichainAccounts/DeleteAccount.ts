import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { MultichainDeleteAccountSelectors } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount.testIds';
import { EncapsulatedElementType } from '../../framework';

class DeleteAccount {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER,
    );
  }

  get deleteAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
    );
  }

  async tapDeleteAccount(): Promise<void> {
    await Gestures.waitAndTap(this.deleteAccountButton, {
      elemDescription: 'Delete Account Button in Delete Account',
    });
  }
}

export default new DeleteAccount();
