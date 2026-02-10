import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { MultichainDeleteAccountSelectors } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount.testIds';

class DeleteAccount {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER,
    );
  }

  get deleteAccountButton(): DetoxElement {
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
