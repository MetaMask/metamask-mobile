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
  // Get withdrawal route to access fee constraints
  const withdrawalRoute = useMemo(() => {
    const controller = Engine.context.PerpsController;
    const routes = controller.getWithdrawalRoutes();
    const isTestnet = controller.state.isTestnet;

    // Find USDC route
    const usdcAssetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.USDC.testnet
      : HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;

    return routes.find((route) => route.assetId === usdcAssetId);
  }, []);

  const formattedQuoteData = useMemo<FormattedQuoteData>(() => {
    // Parse amount
    const amountNum = parseFloat(amount || '0');

    // Get fees from route constraints or use defaults
    const networkFee =
      withdrawalRoute?.constraints?.fees?.fixed ??
      WITHDRAWAL_CONSTANTS.DEFAULT_FEE_AMOUNT;
    const metamaskFee = METAMASK_WITHDRAWAL_FEE; // $0 currently
    const totalFees = networkFee + metamaskFee;

    // Calculate receiving amount
    const receivingAmount = Math.max(0, amountNum - totalFees);

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

    return {
      networkFee: networkFeeDisplay,
      metamaskFee: METAMASK_WITHDRAWAL_FEE_PLACEHOLDER, // "$0.00"
      totalFees: totalFeesDisplay,
      estimatedTime: withdrawalRoute?.constraints?.estimatedTime || '',
      receivingAmount: `${receivingAmount.toFixed(2)} USDC`,
    };
  }, [amount, withdrawalRoute]);

  // Simple validation
  const hasValidQuote = useMemo(() => {
    const amountNum = parseFloat(amount || '0');
    const minAmount = parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
    );
    return amountNum >= minAmount;
  }, [amount, withdrawalRoute]);

  const error = useMemo(() => {
    const amountNum = parseFloat(amount || '0');
    const minAmount = parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
    );
    if (amountNum > 0 && amountNum < minAmount) {
      return strings('perps.withdrawal.amount_too_low', {
        minAmount,
      });
    }
    return null;
  }, [amount, withdrawalRoute]);

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
