import { AddWalletTestIds } from '../../../app/components/Views/AddWallet/AddWallet.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddWalletView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AddWalletTestIds.SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(AddWalletTestIds.SCREEN, {
          exact: true,
        }),
    });
  }

  get linkMetaMaskExtensionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AddWalletTestIds.LINK_METAMASK_EXTENSION_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddWalletTestIds.LINK_METAMASK_EXTENSION_BUTTON,
          { exact: true },
        ),
    });
  }

  async expectScreenVisible(timeout = 15_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Add Wallet screen should be visible',
      timeout,
    });
  }

  async tapLinkMetaMaskExtension(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.linkMetaMaskExtensionButton, {
      description: 'Link MetaMask extension button',
      timeout: 15_000,
    });
  }
}

export default new AddWalletView();
