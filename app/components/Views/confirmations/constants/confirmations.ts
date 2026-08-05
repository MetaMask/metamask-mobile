import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

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
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.predictDepositAndOrder,
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
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictDepositAndOrder,
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
export const HIDE_NETWORK_FILTER_TYPES = [
  TransactionType.perpsDepositAndOrder,
  TransactionType.predictDepositAndOrder,
];

/**
 * Post-quote transaction types that use a "Receive as" token picker
 * instead of "Pay with" for selecting the destination token.
 */
export const POST_QUOTE_TRANSACTION_TYPES = [
  TransactionType.predictWithdraw,
  TransactionType.perpsWithdraw,
  TransactionType.moneyAccountWithdraw,
] as const;

/**
 * Transaction types that use user's currency instead of USD for display.
 * mUSD is a stablecoin pegged to USD, so we convert to user's local currency.
 */
export const USER_CURRENCY_TYPES = [TransactionType.musdClaim] as const;

/**
 * Transaction types that participate in the pay flow (deposits, orders,
 * conversions, withdrawals). Token/amount displays inside these confirmations
 * are priced in USD unless the type is also in {@link USER_CURRENCY_TYPES}.
 */
export const PAY_TRANSACTION_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
  TransactionType.predictWithdraw,
] as const;

export const RELAY_DEPOSIT_TYPES = [
  TransactionType.relayDeposit,
  TransactionType.musdRelayDeposit,
  TransactionType.perpsRelayDeposit,
  TransactionType.predictRelayDeposit,
];

export const MM_PAY_TRANSACTION_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
  TransactionType.predictWithdraw,
];

/**
 * Transaction types that require a Pay quote before publishing.
 * These transactions will fail if no quotes are available.
 */
export const QUOTE_REQUIRED_TRANSACTION_TYPES = [
  TransactionType.moneyAccountDeposit,
] as const;

/**
 * MetaMask Pay transaction types that cannot work without a payment token
 * (unless paying with fiat). Confirmation is blocked and publish throws when
 * no payment token is set. Claims and withdraws are excluded because they can
 * legitimately submit without engaging MetaMask Pay.
 */
export const PAY_TOKEN_REQUIRED_TRANSACTION_TYPES = [
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
] as const;
