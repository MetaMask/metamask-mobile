import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { MusdConversionVariant } from '../../../UI/Earn/hooks/useMusdConversion';

export const MMM_ORIGIN = 'metamask';
export const MM_MOBILE_ORIGIN = 'Metamask Mobile';

export const SIGNATURE_APPROVAL_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

export const REDESIGNED_TRANSACTION_TYPES = [
  TransactionType.batch,
  TransactionType.contractInteraction,
  TransactionType.deployContract,
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
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
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
];

export const APPROVE_TRANSACTION_TYPES = [
  TransactionType.tokenMethodApprove,
  TransactionType.tokenMethodIncreaseAllowance,
  TransactionType.tokenMethodSetApprovalForAll,
];

export const TRANSFER_TRANSACTION_TYPES = [
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
];

export const FULL_SCREEN_CONFIRMATIONS = [
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
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

/**
 * Transaction types for which the Pay With modal hides the network filter.
 * Used when pay token selection is constrained to a single network (e.g. Perps).
 */
export const HIDE_NETWORK_FILTER_TYPES = [TransactionType.perpsDepositAndOrder];

/**
 * Post-quote transaction types that use a "Receive as" token picker
 * instead of "Pay with" for selecting the destination token.
 */
export const POST_QUOTE_TRANSACTION_TYPES = [
  TransactionType.predictWithdraw,
  // TransactionType.perpsWithdraw, // Add when implementing for Perps
] as const;

/**
 * Transaction types that use user's currency instead of USD for display.
 * mUSD is a stablecoin pegged to USD, so we convert to user's local currency.
 */
export const USER_CURRENCY_TYPES = [TransactionType.musdClaim] as const;

export type ConfirmationPresentation = 'fullScreen' | 'bottomSheet';

/**
 * Presentation overrides for confirmations that share a TransactionType but
 * require different UI depending on a generic confirmation "variant".
 */
export const CONFIRMATION_PRESENTATION_BY_VARIANT: Partial<
  Record<TransactionType, Partial<Record<string, ConfirmationPresentation>>>
> = {
  [TransactionType.musdConversion]: {
    [MusdConversionVariant.QUICK_CONVERT]: 'bottomSheet',
    [MusdConversionVariant.CUSTOM_CONVERT]: 'fullScreen',
  },
};
