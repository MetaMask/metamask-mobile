import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { MultichainDeleteAccountSelectors } from '../../selectors/MultichainAccounts/DeleteAccount.selectors';

class DeleteAccount {
  get container() {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.deleteAccountContainer,
    );
  }

  get deleteAccountButton() {
    return Matchers.getElementByID(
      MultichainDeleteAccountSelectors.deleteAccountRemoveButton,
    );
  }

  async tapDeleteAccount() {
    await Gestures.waitAndTap(this.deleteAccountButton);
  }
}

export default new DeleteAccount();
