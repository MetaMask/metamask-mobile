import {
  ContractApprovalModalSelectorsIDs,
  ContractApprovalModalSelectorsText,
} from '../../selectors/Modals/ContractApprovalModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ContractApprovalModal {
  get container() {
    return Matchers.getElementByID(ContractApprovalModalSelectorsIDs.CONTAINER);
  }

  get addNickName() {
    return Matchers.getElementByText(
      ContractApprovalModalSelectorsText.ADD_NICKNAME,
    );
  }

  get editNickName() {
    return Matchers.getElementByText(
      ContractApprovalModalSelectorsText.EDIT_NICKNAME,
    );
  }

  get rejectButton() {
    return Matchers.getElementByText(ContractApprovalModalSelectorsText.REJECT);
  }

  get approveButton() {
    return Matchers.getElementByText(
      ContractApprovalModalSelectorsText.APPROVE,
    );
  }

  get contractAddress() {
    return Matchers.getElementByID(
      ContractApprovalModalSelectorsIDs.CONTRACT_ADDRESS,
    );
  }

  get nextButton() {
    return Matchers.getElementByText(ContractApprovalModalSelectorsText.NEXT);
  }

  get approveTokenAmount() {
    return Matchers.getElementByID(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
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

export default new ContractApprovalModal();
