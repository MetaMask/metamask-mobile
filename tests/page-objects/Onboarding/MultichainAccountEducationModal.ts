import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from '../../../app/components/Views/MultichainAccounts/IntroModal/testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class MultichainAccountEducationModal {
  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
        ),
    });
  }

  async isVisible(timeout?: number): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.closeButton);
        await el.waitForDisplayed({ timeout: timeout ?? 10000 });
      },
    });
  }

  async tapGotItButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton, {
      description: 'Multichain Account Education Modal Got It Button',
    });
  }
}

export default new MultichainAccountEducationModal();
