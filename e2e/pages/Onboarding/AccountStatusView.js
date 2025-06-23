import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { AccountStatusSelectorIDs } from '../../selectors/Onboarding/AccountStatusView.selectors';

class AccountStatusView {
  get container() {
    return Matchers.getElementByID(AccountStatusSelectorIDs.CONTAINER_ID);
  }

  get title() {
    return Matchers.getElementByID(AccountStatusSelectorIDs.TITLE_ID);
  }

  get createOrLogInButton() {
    return Matchers.getElementByID(AccountStatusSelectorIDs.CREATE_OR_LOG_IN_BUTTON_ID);
  }

  get useDifferentLoginMethodButton() {
    return Matchers.getElementByID(AccountStatusSelectorIDs.USE_DIFFERENT_LOGIN_METHOD_BUTTON_ID);
  }

  async tapCreateOrLogInButton() {
    await Gestures.waitAndTap(this.createOrLogInButton);
  }

  async tapUseDifferentLoginMethodButton() {
    await Gestures.waitAndTap(this.useDifferentLoginMethodButton);
  }
}

export default new AccountStatusView();