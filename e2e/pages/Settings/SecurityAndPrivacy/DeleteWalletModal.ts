import {
  DeleteWalletModalSelectorsIDs,
  DeleteWalletModalSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class DeleteWalletModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(DeleteWalletModalSelectorsIDs.CONTAINER);
  }

  get understandButton(): DetoxElement {
    return Matchers.getElementByText(
      DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
    );
  }

  get deleteWalletButton(): DetoxElement {
    return Matchers.getElementByText(DeleteWalletModalSelectorsText.DELETE_MY);
  }

  get deleteInput(): DetoxElement {
    return Matchers.getElementByID(DeleteWalletModalSelectorsIDs.INPUT);
  }

  async tapIUnderstandButton(): Promise<void> {
    await Gestures.waitAndTap(this.understandButton, {
      elemDescription: 'I Understand Button in Delete Wallet Modal',
    });
  }

  async tapDeleteMyWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteWalletButton, {
      elemDescription: 'Delete My Wallet Button in Delete Wallet Modal',
    });
  }

  async typeDeleteInInputBox(): Promise<void> {
    await Gestures.typeText(this.deleteInput, 'delete', {
      elemDescription: 'Delete input box in Delete Wallet Modal',
    });
  }
}

export default new DeleteWalletModal();
