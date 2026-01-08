import {
  NestedTransactionMetadata,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ethers } from 'ethers';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';

// Aave V3 ABIs for decoding transaction data
export const AAVE_V3_SUPPLY_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
];

export const AAVE_V3_WITHDRAW_ABI = [
  'function withdraw(address asset, uint256 amount, address to)',
];

// Lending transaction types to filter for
export const LENDING_TYPES = [
  TransactionType.lendingDeposit,
  TransactionType.lendingWithdraw,
];

/**
 * Transaction event types for lifecycle tracking
 */
export type TransactionEventType =
  | 'submitted'
  | 'confirmed'
  | 'rejected'
  | 'dropped'
  | 'failed';

/**
 * Extracted lending transaction info containing type and encoded data
 */
export interface LendingTransactionInfo {
  type: TransactionType.lendingDeposit | TransactionType.lendingWithdraw;
  data: string;
}

/**
 * Decoded lending transaction data containing token address and amount
 */
export interface DecodedLendingData {
  tokenAddress: string;
  amountMinimalUnit: string;
}

/**
 * Get the lending transaction info (type and data) from the transaction.
 * For batch transactions, extracts from nestedTransactions.
 * For direct transactions, uses the transaction itself.
 *
 * @param transactionMeta - The transaction metadata
 * @returns LendingTransactionInfo or null if not found/invalid
 */
export const getLendingTransactionInfo = (
  transactionMeta: TransactionMeta,
): LendingTransactionInfo | null => {
  // Direct lending transaction
  if (
    transactionMeta.type === TransactionType.lendingDeposit ||
    transactionMeta.type === TransactionType.lendingWithdraw
  ) {
    const data = transactionMeta.txParams?.data;
    if (!data) {
      return null;
    }
    return {
      type: transactionMeta.type,
      data: data as string,
    };
  }

  // Batch: find nested lending transaction
  const nestedLendingTx = transactionMeta.nestedTransactions?.find(
    (tx: NestedTransactionMetadata) =>
      tx.type === TransactionType.lendingDeposit ||
      tx.type === TransactionType.lendingWithdraw,
  );

  if (!nestedLendingTx) {
    return null;
  }

  if (!nestedLendingTx.data) {
    return null;
  }

  return {
    type: nestedLendingTx.type as
      | TransactionType.lendingDeposit
      | TransactionType.lendingWithdraw,
    data: nestedLendingTx.data as string,
  };
};

/**
 * Decode lending transaction data to extract token address and amount.
 *
 * @param lendingInfo - The lending transaction info with type and encoded data
 * @returns DecodedLendingData with tokenAddress and amountMinimalUnit, or null if decoding fails
 */
export const decodeLendingTransactionData = (
  lendingInfo: LendingTransactionInfo,
): DecodedLendingData | null => {
  const isDeposit = lendingInfo.type === TransactionType.lendingDeposit;

  try {
    const abi = isDeposit ? AAVE_V3_SUPPLY_ABI : AAVE_V3_WITHDRAW_ABI;
    const functionName = isDeposit ? 'supply' : 'withdraw';

    const contractInterface = new ethers.utils.Interface(abi);
    const decoded = contractInterface.decodeFunctionData(
      functionName,
      lendingInfo.data,
    );

    const tokenAddress = decoded[0] as string;
    const amountMinimalUnit = decoded[1].toString();

    return { tokenAddress, amountMinimalUnit };
  } catch {
    return null;
  }
};

/**
 * @deprecated Use decodeLendingTransactionData instead
 * Kept for backward compatibility - extracts only the token address
 */
export const extractUnderlyingTokenAddress = (
  lendingInfo: LendingTransactionInfo,
): string | null => {
  const decoded = decodeLendingTransactionData(lendingInfo);
  return decoded?.tokenAddress ?? null;
};

/**
 * Build analytics properties for tracking lending transaction events.
 * Matches the properties tracked by EarnLendingDepositConfirmationView and
 * EarnLendingWithdrawalConfirmationView for parity across flows.
 *
 * @param transactionMeta - The transaction metadata
 * @param actionType - Whether this is a deposit or withdrawal
 * @param earnToken - The earn token details (optional)
 * @param amountMinimalUnit - The transaction amount in minimal units (optional)
 * @param networkName - The network name (optional)
 * @returns Analytics properties object
 */
export const getTrackEventProperties = (
  transactionMeta: TransactionMeta,
  actionType: 'deposit' | 'withdrawal',
  earnToken: EarnTokenDetails | undefined,
  amountMinimalUnit?: string,
  networkName?: string,
) => {
  // Format transaction value if we have amount and token decimals
  let transactionValue: string | undefined;
  if (amountMinimalUnit && earnToken?.decimals !== undefined) {
    const formattedAmount = renderFromTokenMinimalUnit(
      amountMinimalUnit,
      earnToken.decimals,
    );
    transactionValue = `${formattedAmount} ${earnToken.symbol ?? ''}`.trim();
  }

  return {
    action_type: actionType,
    token: earnToken?.symbol,
    network: networkName,
    user_token_balance: earnToken?.balanceFormatted,
    transaction_value: transactionValue,
    experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
    transaction_id: transactionMeta.id,
    transaction_type: transactionMeta.type,
  };
};

/**
 * Get the MetaMetrics event for a given transaction event type.
 *
 * @param eventType - The transaction lifecycle event type
 * @returns The corresponding MetaMetrics event
 */
export const getMetricsEvent = (eventType: TransactionEventType) => {
  const eventMap = {
    submitted: MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED,
    confirmed: MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
    rejected: MetaMetricsEvents.EARN_TRANSACTION_REJECTED,
    dropped: MetaMetricsEvents.EARN_TRANSACTION_DROPPED,
    failed: MetaMetricsEvents.EARN_TRANSACTION_FAILED,
  };
  return eventMap[eventType];
};
