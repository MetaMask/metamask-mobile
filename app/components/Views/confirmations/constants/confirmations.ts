import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

export const MMM_ORIGIN = 'metamask';

export const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

export const REDESIGNED_TRANSACTION_TYPES = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
  TransactionType.contractInteraction,
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.batch,
  TransactionType.revokeDelegation,
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodSetApprovalForAll,
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
];

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
];
