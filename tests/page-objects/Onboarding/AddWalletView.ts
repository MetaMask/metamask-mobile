import { AddWalletTestIds } from '../../../app/components/Views/AddWallet/AddWallet.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class AddWalletView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AddWalletTestIds.SCREEN);
  }

  get linkMetaMaskExtensionButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AddWalletTestIds.LINK_METAMASK_EXTENSION_BUTTON,
    );
  }

  async expectScreenVisible(timeout = 15_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Add Wallet screen should be visible',
      timeout,
    });
  }

  async tapLinkMetaMaskExtension(): Promise<void> {
    await Gestures.waitAndTap(this.linkMetaMaskExtensionButton, {
      elemDescription: 'Link MetaMask extension button',
      timeout: 15_000,
    });
  }
}

export default new AddWalletView();
