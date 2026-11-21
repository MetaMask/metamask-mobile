import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import { formatPerpsFiat, formatPerpsUsdCents } from '../utils/formatUtils';
import {
  PERPS_DISPLAY_PRECISION,
  type AssetRoute,
  WITHDRAWAL_CONSTANTS,
} from '@metamask/perps-controller';
import {
  METAMASK_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
} from '../constants/perpsUIConfig';

interface PerpsWithdrawQuoteParams {
  amount: string;
  withdrawalRoute?: AssetRoute;
}

interface FormattedQuoteData {
  networkFee: string;
  metamaskFee: string;
  totalFees: string;
  estimatedTime: string;
  receivingAmount: string;
}

/**
 * Hook for calculating withdrawal quote data
 * Simple calculation since withdrawals have fixed fees and no bridging
 */
export const usePerpsWithdrawQuote = ({
  amount,
  withdrawalRoute,
}: PerpsWithdrawQuoteParams) => {
  // Parse and validate amount once
  const { parsedAmount, isValid } = useMemo(() => {
    const trimmedAmount = (amount || '').trim();
    if (trimmedAmount === '') {
      return { parsedAmount: 0, isValid: false };
    }

    const parsed = Number.parseFloat(trimmedAmount);
    // Check if the input is a valid positive number
    // Using Number() for stricter parsing - it returns NaN for '123abc'
    const strictParsed = Number(trimmedAmount);
    const valid =
      !Number.isNaN(strictParsed) &&
      Number.isFinite(strictParsed) &&
      strictParsed > 0;

    return { parsedAmount: parsed, isValid: valid };
  }, [amount]);

  // Numeric network fee, for arithmetic; never re-parse the localized display.
  const networkFeeAmount: number =
    withdrawalRoute?.constraints?.fees?.fixed ??
    WITHDRAWAL_CONSTANTS.DefaultFeeAmount;

  const formattedQuoteData = useMemo<FormattedQuoteData>(() => {
    const networkFee = networkFeeAmount;
    const metamaskFee = METAMASK_WITHDRAWAL_FEE; // $0 currently
    const totalFees = networkFee + metamaskFee;

    // Calculate receiving amount - use 0 if amount is invalid
    const receivingAmount = isValid ? Math.max(0, parsedAmount - totalFees) : 0;

    // Format fees with token symbol if available
    const feeToken = withdrawalRoute?.constraints?.fees?.token || 'USDC';
    const networkFeeDisplay =
      feeToken === 'USDC'
        ? formatPerpsUsdCents(networkFee)
        : `${networkFee} ${feeToken}`;
    const totalFeesDisplay =
      feeToken === 'USDC'
        ? formatPerpsUsdCents(totalFees)
        : `${totalFees} ${feeToken}`;

    // Format estimated time from minutes (new) or use legacy string
    const estimatedMinutes = withdrawalRoute?.constraints?.estimatedMinutes;
    let estimatedTime = '';
    if (estimatedMinutes !== undefined) {
      estimatedTime =
        estimatedMinutes > 1
          ? strings('time.minutes_format_plural', { count: estimatedMinutes })
          : strings('time.minutes_format', { count: estimatedMinutes });
    } else if (withdrawalRoute?.constraints?.estimatedTime) {
      // Fallback for backward compatibility
      estimatedTime = withdrawalRoute.constraints.estimatedTime;
    }

    return {
      networkFee: networkFeeDisplay,
      metamaskFee: METAMASK_WITHDRAWAL_FEE_PLACEHOLDER, // "$0.00"
      totalFees: totalFeesDisplay,
      estimatedTime,
      // A USDC amount: the fiat formatter without its currency symbol.
      receivingAmount: `${formatPerpsFiat(receivingAmount, {
        symbol: false,
        minimumDecimals: 0,
        maximumDecimals: PERPS_DISPLAY_PRECISION.Fee,
      })} USDC`,
    };
  }, [parsedAmount, isValid, withdrawalRoute, networkFeeAmount]);

  // Simple validation
  const hasValidQuote = useMemo(() => {
    if (!isValid) {
      return false;
    }

    const minAmount = Number.parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DefaultMinAmount,
    );
    return parsedAmount >= minAmount;
  }, [parsedAmount, isValid, withdrawalRoute]);

  const error = useMemo(() => {
    // Don't show error for empty or invalid input
    if (!isValid || parsedAmount === 0) {
      return null;
    }

    const minAmount = Number.parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DefaultMinAmount,
    );
    if (parsedAmount > 0 && parsedAmount < minAmount) {
      return strings('perps.withdrawal.amount_too_low', {
        minAmount,
      });
    }
    return null;
  }, [parsedAmount, isValid, withdrawalRoute]);

  return {
    formattedQuoteData,
    networkFeeAmount,
    hasValidQuote,
    error,
    // These are not needed for withdrawals but kept for consistency with deposit hook
    isLoading: false,
    isExpired: false,
    willRefresh: false,
    quoteFetchError: null,
  };
};
