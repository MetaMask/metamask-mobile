import { ProtectWalletModalSelectorsIDs } from '../../../app/components/UI/ProtectYourWalletModal/ProtectWalletModal.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

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
