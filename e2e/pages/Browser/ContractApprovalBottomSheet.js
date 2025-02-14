import {
  ContractApprovalBottomSheetSelectorsIDs,
  ContractApprovalBottomSheetSelectorsText,
} from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ContractApprovalBottomSheet {
  get container() {
    return Matchers.getElementByID(ContractApprovalBottomSheetSelectorsIDs.CONTAINER);
  }

  get addNickName() {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.ADD_NICKNAME,
    );
  }

  get editNickName() {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.EDIT_NICKNAME,
    );
  }

  get rejectButton() {
    return Matchers.getElementByText(ContractApprovalBottomSheetSelectorsText.REJECT);
  }

  get approveButton() {
    return Matchers.getElementByText(
      ContractApprovalBottomSheetSelectorsText.APPROVE,
    );
  }

  get contractAddress() {
    return Matchers.getElementByID(
      ContractApprovalBottomSheetSelectorsIDs.CONTRACT_ADDRESS,
    );
  }

  get nextButton() {
    return Matchers.getElementByText(ContractApprovalBottomSheetSelectorsText.NEXT);
  }

  get approveTokenAmount() {
    return Matchers.getElementByID(
      ContractApprovalBottomSheetSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
  }

  get confirmButton() {
    return Matchers.getElementByText(ContractApprovalBottomSheetSelectorsText.CONFIRM);
  }

  async tapAddNickName() {
    await Gestures.waitAndTap(this.addNickName);
  }
  async tapEditNickName() {
    await Gestures.waitAndTap(this.editNickName);
  }

  async tapRejectButton() {
    await Gestures.waitAndTap(this.rejectButton);
  }

  async tapApproveButton() {
    await Gestures.waitAndTap(this.approveButton);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapToCopyContractAddress() {
    await Gestures.waitAndTap(this.contractAddress);
  }

  async tapNextButton() {
    await Gestures.waitAndTap(this.nextButton);
  }

  async inputCustomAmount(amount) {
    await Gestures.typeTextAndHideKeyboard(this.approveTokenAmount, amount);
  }

  async clearInput() {
    await Gestures.clearField(this.approveTokenAmount);
  }
}

export default new ContractApprovalBottomSheet();
