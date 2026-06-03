import {
  DeleteWalletModalSelectorsIDs,
  DeleteWalletModalSelectorsText,
} from '../../../../app/components/UI/DeleteWalletModal/DeleteWalletModal.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class DeleteWalletModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(DeleteWalletModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          DeleteWalletModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get understandButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
        ),
    });
  }

  get deleteWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(DeleteWalletModalSelectorsText.DELETE_MY),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          DeleteWalletModalSelectorsText.DELETE_MY,
        ),
    });
  }

  get deleteInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(DeleteWalletModalSelectorsIDs.INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(DeleteWalletModalSelectorsIDs.INPUT),
    });
  }

  async tapIUnderstandButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.understandButton, {
      elemDescription: 'I Understand Button in Delete Wallet Modal',
    });
  }

  async tapDeleteMyWalletButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteWalletButton, {
      elemDescription: 'Delete My Wallet Button in Delete Wallet Modal',
    });
  }

  async typeDeleteInInputBox(): Promise<void> {
    await UnifiedGestures.typeText(this.deleteInput, 'delete', {
      elemDescription: 'Delete input box in Delete Wallet Modal',
    });
  }
}

export default new DeleteWalletModal();
