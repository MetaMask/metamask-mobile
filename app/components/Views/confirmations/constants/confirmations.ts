import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

export const MMM_ORIGIN = 'metamask';
export const MM_MOBILE_ORIGIN = 'Metamask Mobile';

export const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

export const REDESIGNED_TRANSACTION_TYPES = [
  TransactionType.batch,
  TransactionType.contractInteraction,
  TransactionType.deployContract,
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.revokeDelegation,
  TransactionType.simpleSend,
  TransactionType.stakingClaim,
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodIncreaseAllowance,
  TransactionType.tokenMethodSetApprovalForAll,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
];

export const REDESIGNED_APPROVE_TYPES = [
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodIncreaseAllowance,
  TransactionType.tokenMethodSetApprovalForAll,
];

export const REDESIGNED_TRANSFER_TYPES = [
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
];

export const REDESIGNED_CONTRACT_INTERACTION_TYPES = [
  TransactionType.contractInteraction,
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
];

export const FULL_SCREEN_CONFIRMATIONS = [
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
  TransactionType.simpleSend,
  TransactionType.stakingClaim,
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
];

export const EARN_CONTRACT_INTERACTION_TYPES = [
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
];
