import {
  DeleteWalletModalSelectorsIDs,
  DeleteWalletModalSelectorsText,
} from '../../../../app/components/UI/DeleteWalletModal/DeleteWalletModal.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { EncapsulatedElementType } from '../../../framework';

class DeleteWalletModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(DeleteWalletModalSelectorsIDs.CONTAINER);
  }

  get understandButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
    );
  }

  get deleteWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByText(DeleteWalletModalSelectorsText.DELETE_MY);
  }

  get deleteInput(): EncapsulatedElementType {
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
