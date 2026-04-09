import { ProtectWalletModalSelectorsIDs } from '../../../app/components/UI/ProtectYourWalletModal/ProtectWalletModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class ProtectYourWalletModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(ProtectWalletModalSelectorsIDs.CONTAINER);
  }

  get remindMeLaterButton(): DetoxElement {
    return Matchers.getElementByID(
      ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  get collapseWalletModal(): DetoxElement {
    return Matchers.getElementByID(
      ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL,
    );
  }

  async tapRemindMeLaterButton(): Promise<void> {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ProtectYourWalletModal();
