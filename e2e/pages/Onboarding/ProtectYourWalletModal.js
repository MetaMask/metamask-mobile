import { ProtectWalletModalSelectorsIDs } from '../../selectors/Onboarding/ProtectWalletModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ProtectYourWalletModal {
  get container() {
    return Matchers.getElementByID(ProtectWalletModalSelectorsIDs.CONTAINER);
  }

  get remindMeLaterButton() {
    return Matchers.getElementByID(
      ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  get collapseWalletModal() {
    return Matchers.getElementByID(
      ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL,
    );
  }

  async tapRemindMeLaterButton() {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ProtectYourWalletModal();
