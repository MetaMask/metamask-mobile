import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

export const MMM_ORIGIN = 'Metamask Mobile';

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

export enum EIP5792ErrorCode {
  UnsupportedNonOptionalCapability = 5700,
  UnsupportedChainId = 5710,
  UnknownBundleId = 5730,
  RejectedUpgrade = 5750,
}
