import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { MultichainDeleteAccountSelectors } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount.testIds';
import { type AppiumElement } from '../../framework';

class DeleteAccount {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER,
    );
  }

  get deleteAccountButton(): Promise<AppiumElement> {
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
