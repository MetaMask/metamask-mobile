import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { MultichainDeleteAccountSelectors } from '../../selectors/MultichainAccounts/DeleteAccount.selectors';

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
