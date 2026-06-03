// TODO: This file references legacy confirmation UI that was removed.
// The ContractApprovalBottomSheet.testIds file no longer exists.
// This e2e page object needs to be updated to use redesigned confirmation testIds
// or deleted if the functionality is no longer tested.

// import {
//   ContractApprovalBottomSheetSelectorsIDs,
//   ContractApprovalBottomSheetSelectorsText,
// } from '../../../app/components/Views/confirmations/legacy/components/ContractApprovalBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

// Temporary placeholders to prevent TypeScript errors
const ContractApprovalBottomSheetSelectorsIDs = {
  CONTAINER: 'contract-approval-bottom-sheet-container',
  CONTRACT_ADDRESS: 'contract-approval-contract-address',
  APPROVE_TOKEN_AMOUNT: 'contract-approval-token-amount',
};

const ContractApprovalBottomSheetSelectorsText = {
  ADD_NICKNAME: 'Add Nickname',
  EDIT_NICKNAME: 'Edit Nickname',
  REJECT: 'Reject',
  APPROVE: 'Approve',
  NEXT: 'Next',
  CONFIRM: 'Confirm',
};

class ContractApprovalBottomSheet {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ContractApprovalBottomSheetSelectorsIDs.CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ContractApprovalBottomSheetSelectorsIDs.CONTAINER,
        ),
    });
  }

  get addNickName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.ADD_NICKNAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.ADD_NICKNAME,
        ),
    });
  }

  get editNickName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.EDIT_NICKNAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.EDIT_NICKNAME,
        ),
    });
  }

  get rejectButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.REJECT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.REJECT,
        ),
    });
  }

  get approveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        ),
    });
  }

  get contractAddress(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ContractApprovalBottomSheetSelectorsIDs.CONTRACT_ADDRESS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ContractApprovalBottomSheetSelectorsIDs.CONTRACT_ADDRESS,
        ),
    });
  }

  get nextButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.NEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.NEXT,
        ),
    });
  }

  get approveTokenAmount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ContractApprovalBottomSheetSelectorsIDs.APPROVE_TOKEN_AMOUNT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ContractApprovalBottomSheetSelectorsIDs.APPROVE_TOKEN_AMOUNT,
        ),
    });
  }

  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.CONFIRM,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ContractApprovalBottomSheetSelectorsText.CONFIRM,
        ),
    });
  }

  async tapAddNickName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addNickName, {
      elemDescription: 'Tap on the add nickname button',
    });
  }
  async tapEditNickName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editNickName, {
      elemDescription: 'Tap on the edit nickname button',
    });
  }

  async tapRejectButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.rejectButton, {
      elemDescription: 'Tap on the reject button',
    });
  }

  async tapApproveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.approveButton, {
      elemDescription: 'Tap on the approve button',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Tap on the confirm button',
    });
  }

  async tapToCopyContractAddress(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.contractAddress, {
      elemDescription: 'Tap on the contract address',
    });
  }

  async tapNextButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.nextButton, {
      elemDescription: 'Tap on the next button',
    });
  }

  async inputCustomAmount(amount: string): Promise<void> {
    await UnifiedGestures.typeText(this.approveTokenAmount, amount);
  }

  async clearInput(): Promise<void> {
    await UnifiedGestures.typeText(this.approveTokenAmount, '', {
      clearFirst: true,
      hideKeyboard: false,
      elemDescription: 'Clear the input field',
    });
  }
}

export default new ContractApprovalBottomSheet();
