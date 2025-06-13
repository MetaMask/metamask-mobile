import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { MultichainDeleteAccountsSelectors } from '../../selectors/MultichainAccounts/DeleteAccount.selectors';

class DeleteAccount {
  get container() {
    return Matchers.getElementByID(
      MultichainDeleteAccountsSelectors.deleteAccountContainer,
    );
  }

  get deleteAccountButton() {
    return Matchers.getElementByID(
      MultichainDeleteAccountsSelectors.deleteAccountRemoveButton,
    );
  }

  async tapDeleteAccount() {
    await Gestures.waitAndTap(this.deleteAccountButton);
  }
}

export default new DeleteAccount();
