/**
 * mUSD utility functions for Earn namespace
 */

import { Interface } from '@ethersproject/abi';
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
import { DISTRIBUTOR_CLAIM_ABI } from '../components/MerklRewards/constants';

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
  /** Raw claim amount from decodeMerklClaimAmount (wei string) */
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

/**
 * Decode the claim amount from a Merkl claim transaction data.
 * The claim function signature is: claim(address[] users, address[] tokens, uint256[] amounts, bytes32[][] proofs)
 *
 * @param data - The transaction data hex string
 * @returns The first claim amount as a string (raw value, not adjusted for decimals), or null if decoding fails
 */
export function decodeMerklClaimAmount(
  data: string | undefined,
): string | null {
  if (!data || typeof data !== 'string') {
    return null;
  }

  try {
    const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
    const decoded = contractInterface.decodeFunctionData('claim', data);
    // amounts is the 3rd parameter (index 2)
    const amounts = decoded[2];
    if (!amounts || amounts.length === 0) {
      return null;
    }
    return amounts[0].toString();
  } catch {
    return null;
  }
}
