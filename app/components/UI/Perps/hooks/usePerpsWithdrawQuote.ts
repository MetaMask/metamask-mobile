import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  HYPERLIQUID_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
  WITHDRAWAL_ESTIMATED_TIME,
} from '../constants/hyperLiquidConfig';

interface PerpsWithdrawQuoteParams {
  amount: string;
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
export const usePerpsWithdrawQuote = ({ amount }: PerpsWithdrawQuoteParams) => {
  const formattedQuoteData = useMemo<FormattedQuoteData>(() => {
    // Parse amount
    const amountNum = parseFloat(amount || '0');

    // Calculate fees
    const networkFee = HYPERLIQUID_WITHDRAWAL_FEE; // $1
    const metamaskFee = METAMASK_WITHDRAWAL_FEE; // $0 currently
    const totalFees = networkFee + metamaskFee;

    // Calculate receiving amount
    const receivingAmount = Math.max(0, amountNum - totalFees);

    return {
      networkFee: `$${networkFee.toFixed(2)}`,
      metamaskFee: METAMASK_WITHDRAWAL_FEE_PLACEHOLDER, // "$0.00"
      totalFees: `$${totalFees.toFixed(2)}`,
      estimatedTime: WITHDRAWAL_ESTIMATED_TIME,
      receivingAmount: `${receivingAmount.toFixed(2)} USDC`,
    };
  }, [amount]);

  // Simple validation
  const hasValidQuote = useMemo(() => {
    const amountNum = parseFloat(amount || '0');
    return amountNum > HYPERLIQUID_WITHDRAWAL_FEE; // Must be greater than $1 fee
  }, [amount]);

  const error = useMemo(() => {
    const amountNum = parseFloat(amount || '0');
    if (amountNum > 0 && amountNum <= HYPERLIQUID_WITHDRAWAL_FEE) {
      return strings('perps.withdrawal.amount_too_low', {
        minAmount: HYPERLIQUID_WITHDRAWAL_FEE + 0.01,
      });
    }
    return null;
  }, [amount]);

  return {
    formattedQuoteData,
    hasValidQuote,
    error,
    // These are not needed for withdrawals but kept for consistency with deposit hook
    isLoading: false,
    isExpired: false,
    willRefresh: false,
    quoteFetchError: null,
  };
};
