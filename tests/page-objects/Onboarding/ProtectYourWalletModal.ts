import { ProtectWalletModalSelectorsIDs } from '../../../app/components/UI/ProtectYourWalletModal/ProtectWalletModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ProtectYourWalletModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ProtectWalletModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ProtectWalletModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get remindMeLaterButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON,
        ),
    });
  }

  get collapseWalletModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL,
        ),
    });
  }

  async tapRemindMeLaterButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ProtectYourWalletModal();
