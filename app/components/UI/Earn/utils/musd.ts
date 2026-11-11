/**
 * mUSD utility functions for Earn namespace
 */

import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { areAddressesEqual } from '../../../../util/address';
import { calcTokenAmount } from '../../../../util/transactions';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../constants/musd';

/**
 * Parameters for checking if a transaction is a mUSD claim for the current view.
 */
export interface IsMusdClaimForCurrentViewParams {
  /** Transaction to check */
  tx: {
    type?: TransactionType;
    status?: string;
    chainId?: Hex;
    txParams?: {
      from?: string;
    };
  };
  /** Token address being viewed (should be lowercased or checksummed) */
  navAddress: string;
  /** Token symbol being viewed (should be lowercased) */
  navSymbol: string;
  /** Current chain ID */
  chainId: Hex;
  /** Currently selected account address */
  selectedAddress: string;
}

/**
 * Check if transaction is a Merkl mUSD yield claim that should be shown in current view.
 * These transactions interact with the Merkl distributor contract (not the mUSD token directly),
 * so they won't be caught by standard token transfer detection and need special handling.
 *
 * @param params - The parameters for the check
 * @returns true if the transaction should be shown in the current mUSD view
 */
export function isMusdClaimForCurrentView({
  tx,
  navAddress,
  navSymbol,
  chainId,
  selectedAddress,
}: IsMusdClaimForCurrentViewParams): boolean {
  const isMusdView =
    areAddressesEqual(navAddress, MUSD_TOKEN_ADDRESS) ||
    navSymbol === MUSD_TOKEN.symbol.toLowerCase();
  const isFromSelectedAccount = areAddressesEqual(
    tx.txParams?.from ?? '',
    selectedAddress,
  );
  return (
    tx.type === TransactionType.musdClaim &&
    tx.status !== 'unapproved' &&
    isMusdView &&
    chainId === tx.chainId &&
    isFromSelectedAccount
  );
}

/**
 * Parameters for converting mUSD claim amount to user's currency.
 */
export interface ConvertMusdClaimParams {
  /** Raw claim amount in wei string */
  claimAmountRaw: string;
  /** Native-to-user-currency conversion rate (e.g., ETH to EUR) */
  conversionRate: BigNumber | number;
  /** Native-to-USD conversion rate (e.g., ETH to USD) */
  usdConversionRate: number;
}

/**
 * Result of mUSD claim amount conversion.
 */
export interface ConvertMusdClaimResult {
  /** Claim amount in mUSD decimals (not fiat converted) */
  claimAmountDecimal: BigNumber;
  /** Fiat value in user's currency (or USD if rates unavailable) */
  fiatValue: BigNumber;
  /** Whether the fiat value was converted to user's currency (false = USD fallback) */
  isConverted: boolean;
}

/**
 * Convert raw mUSD claim amount to display values.
 * mUSD is a stablecoin pegged to USD (1 mUSD ≈ $1).
 * Converts to user's currency using: USD * (nativeToUserCurrency / nativeToUSD)
 *
 * @param params - Conversion parameters
 * @returns Converted amounts and conversion status
 */
export function convertMusdClaimAmount({
  claimAmountRaw,
  conversionRate,
  usdConversionRate,
}: ConvertMusdClaimParams): ConvertMusdClaimResult {
  const claimAmountDecimal = calcTokenAmount(claimAmountRaw, MUSD_DECIMALS);
  const conversionRateBN =
    conversionRate instanceof BigNumber
      ? conversionRate
      : new BigNumber(conversionRate);

  if (usdConversionRate > 0 && conversionRateBN.isGreaterThan(0)) {
    const usdToUserCurrencyRate = conversionRateBN.dividedBy(usdConversionRate);
    const fiatValue = claimAmountDecimal.times(usdToUserCurrencyRate);
    return { claimAmountDecimal, fiatValue, isConverted: true };
  }

  // Fallback: no conversion rates available, use 1:1 with USD
  return {
    claimAmountDecimal,
    fiatValue: claimAmountDecimal,
    isConverted: false,
  };
}

// ERC-20 Transfer(address,address,uint256) event topic
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Merkl distributor contract that emits the mUSD Transfer on claim
const MERKL_DISTRIBUTOR_ADDRESS = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';

/**
 * Log entry from a transaction receipt.
 * The `topics` field is typed as `string` in TransactionController types,
 * but at runtime it's `string[]` (raw JSON-RPC response).
 */
interface ReceiptLog {
  address?: string;
  data?: string;
  topics?: string | string[];
}

/**
 * Extract the actual mUSD payout from a confirmed claim transaction's receipt logs.
 *
 * The Merkl distributor calls the mUSD token's `transfer`, which emits an
 * ERC-20 `Transfer(from=distributor, to=user, amount)` event. The `amount`
 * in this event is the real per-transaction payout (not the cumulative total
 * stored in calldata).
 *
 * @param logs - Receipt logs from txReceipt.logs
 * @param userAddress - The claiming user's address (to match the Transfer `to` field)
 * @returns The payout amount as a raw decimal string, or null if not found
 */
export function getClaimPayoutFromReceipt(
  logs: ReceiptLog[] | undefined,
  userAddress: string | undefined,
): string | null {
  if (!logs?.length || !userAddress) {
    return null;
  }

  for (const log of logs) {
    const topics = normalizeTopics(log.topics);
    if (!topics || topics.length < 3) continue;

    const isTransferEvent = topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC;
    const isFromDistributor =
      addressFromTopic(topics[1]) === MERKL_DISTRIBUTOR_ADDRESS.toLowerCase();
    const isToUser = addressFromTopic(topics[2]) === userAddress.toLowerCase();
    const isMuSDToken =
      log.address?.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

    if (isTransferEvent && isFromDistributor && isToUser && isMuSDToken) {
      const amount = log.data;
      if (!amount) continue;
      return BigInt(amount).toString();
    }
  }

  return null;
}

function normalizeTopics(
  topics: string | string[] | undefined,
): string[] | null {
  if (!topics) return null;
  if (Array.isArray(topics)) return topics;
  // Shouldn't happen at runtime, but guard against the type definition
  return null;
}

function addressFromTopic(topic: string | undefined): string | undefined {
  if (!topic || topic.length < 42) return undefined;
  // Topic is a 32-byte hex, address is the last 20 bytes
  return `0x${topic.slice(-40)}`.toLowerCase();
}
