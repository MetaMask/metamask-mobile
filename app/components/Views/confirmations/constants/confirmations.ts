import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

<<<<<<< HEAD
export const MMM_ORIGIN = 'metamask';
export const MM_MOBILE_ORIGIN = 'Metamask Mobile';
=======
export const MMM_ORIGIN = 'Metamask Mobile';
>>>>>>> stable

export const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

export const REDESIGNED_TRANSACTION_TYPES = [
<<<<<<< HEAD
  TransactionType.batch,
  TransactionType.contractInteraction,
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
  TransactionType.revokeDelegation,
  TransactionType.simpleSend,
  TransactionType.stakingClaim,
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodSetApprovalForAll,
=======
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
  TransactionType.contractInteraction,
  TransactionType.simpleSend,
>>>>>>> stable
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

<<<<<<< HEAD
export const REDESIGNED_APPROVE_TYPES = [
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodIncreaseAllowance,
  TransactionType.tokenMethodSetApprovalForAll,
];

=======
>>>>>>> stable
export const REDESIGNED_TRANSFER_TYPES = [
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

<<<<<<< HEAD
export const REDESIGNED_CONTRACT_INTERACTION_TYPES = [
  TransactionType.contractInteraction,
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
];

export const FULL_SCREEN_CONFIRMATIONS = [
  TransactionType.simpleSend,
  TransactionType.stakingClaim,
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

export const EARN_CONTRACT_INTERACTION_TYPES = [
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
=======

// Confirmation UI types
export const FLAT_TRANSACTION_CONFIRMATIONS = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
];

export const STANDALONE_TRANSACTION_CONFIRMATIONS = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
>>>>>>> stable
];
