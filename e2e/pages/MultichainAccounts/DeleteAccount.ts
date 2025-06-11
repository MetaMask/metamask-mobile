import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { MultichainDeleteAccountsSelectors } from '../../selectors/MultichainAccounts/DeleteAccount.selectors';

class DeleteAccount {
  get container() {
    return Matchers.getElementByID(
      MultichainDeleteAccountsSelectors.deleteAccountContainer,
    );
  }

  async tapDeleteAccount() {
    await Gestures.waitAndTap(this.container);
  }
}

export default new DeleteAccount();
