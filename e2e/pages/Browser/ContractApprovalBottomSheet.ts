import {
  ContractApprovalBottomSheetSelectorsIDs,
  ContractApprovalBottomSheetSelectorsText,
} from '../../../app/components/Views/confirmations/legacy/components/ContractApprovalBottomSheet.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class ContractApprovalBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ContractApprovalBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get addNickName(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.ADD_NICKNAME,
    );
  }

  get editNickName(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.EDIT_NICKNAME,
    );
  }

  get rejectButton(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.REJECT,
    );
  }

  get approveButton(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.APPROVE,
    );
  }

  get contractAddress(): DetoxElement {
    return Matchers.getElementByID(
      ContractApprovalBottomSheetSelectorsIDs.CONTRACT_ADDRESS,
    );
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.NEXT,
    );
  }

  get approveTokenAmount(): DetoxElement {
    return Matchers.getElementByID(
      ContractApprovalBottomSheetSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.CONFIRM,
    );
  }

  async tapAddNickName(): Promise<void> {
    await Gestures.waitAndTap(this.addNickName, {
      elemDescription: 'Tap on the add nickname button',
    });
  }
  async tapEditNickName(): Promise<void> {
    await Gestures.waitAndTap(this.editNickName, {
      elemDescription: 'Tap on the edit nickname button',
    });
  }

  async tapRejectButton(): Promise<void> {
    await Gestures.waitAndTap(this.rejectButton, {
      elemDescription: 'Tap on the reject button',
    });
  }

  async tapApproveButton(): Promise<void> {
    await Gestures.waitAndTap(this.approveButton, {
      elemDescription: 'Tap on the approve button',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Tap on the confirm button',
    });
  }

  async tapToCopyContractAddress(): Promise<void> {
    await Gestures.waitAndTap(this.contractAddress, {
      elemDescription: 'Tap on the contract address',
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Tap on the next button',
    });
  }

  async inputCustomAmount(amount: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.approveTokenAmount, amount);
  }

  async clearInput(): Promise<void> {
    await Gestures.typeText(this.approveTokenAmount, '', {
      clearFirst: true,
      elemDescription: 'Clear the input field',
    });
  }
}

export default new ContractApprovalBottomSheet();
