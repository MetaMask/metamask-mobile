import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  METAMASK_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
} from '../constants/hyperLiquidConfig';
import { WITHDRAWAL_CONSTANTS } from '../constants/perpsConfig';

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

  // Get withdrawal route to access fee constraints
  const withdrawalRoute = useMemo(() => {
    const controller = Engine.context.PerpsController;
    const routes = controller.getWithdrawalRoutes();
    const isTestnet = controller.state.isTestnet;

    // Find USDC route
    const usdcAssetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.usdc.testnet
      : HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet;

    return routes.find((route) => route.assetId === usdcAssetId);
  }, []);

  const formattedQuoteData = useMemo<FormattedQuoteData>(() => {
    // Get fees from route constraints or use defaults
    const networkFee =
      withdrawalRoute?.constraints?.fees?.fixed ??
      WITHDRAWAL_CONSTANTS.DefaultFeeAmount;
    const metamaskFee = METAMASK_WITHDRAWAL_FEE; // $0 currently
    const totalFees = networkFee + metamaskFee;

    // Calculate receiving amount - use 0 if amount is invalid
    const receivingAmount = isValid ? Math.max(0, parsedAmount - totalFees) : 0;

    // Format fees with token symbol if available
    const feeToken = withdrawalRoute?.constraints?.fees?.token || 'USDC';
    const networkFeeDisplay =
      feeToken === 'USDC'
        ? `$${networkFee.toFixed(2)}`
        : `${networkFee} ${feeToken}`;
    const totalFeesDisplay =
      feeToken === 'USDC'
        ? `$${totalFees.toFixed(2)}`
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
      receivingAmount: `${receivingAmount.toFixed(2)} USDC`,
    };
  }, [parsedAmount, isValid, withdrawalRoute]);

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
    hasValidQuote,
    error,
    // These are not needed for withdrawals but kept for consistency with deposit hook
    isLoading: false,
    isExpired: false,
    willRefresh: false,
    quoteFetchError: null,
  };
};
