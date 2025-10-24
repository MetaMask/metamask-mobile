import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { HYPERLIQUID_ASSET_CONFIGS } from '../constants/hyperLiquidConfig';
import { WITHDRAWAL_CONSTANTS } from '../constants/perpsConfig';
import { parseCurrencyString } from '../utils/formatUtils';
import { usePerpsNetwork } from './index';
import { usePerpsLiveAccount } from './stream';

interface UseWithdrawValidationParams {
  withdrawAmount: string;
}

/**
 * Hook to handle withdrawal validation logic
 * @param params - The withdrawal amount to validate
 * @returns Validation states and helper functions
 */
export const useWithdrawValidation = ({
  withdrawAmount,
}: UseWithdrawValidationParams) => {
  const { account } = usePerpsLiveAccount();
  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';

  // Available balance from perps account
  const availableBalance = useMemo(() => {
    const balance = account?.availableBalance || '0';
    // Use parseCurrencyString to properly parse formatted currency
    // Return as string to maintain compatibility with components
    return parseCurrencyString(balance).toString();
  }, [account]);

  // Get withdrawal route for constraints
  const withdrawalRoute = useMemo(() => {
    const controller = Engine.context.PerpsController;
    const routes = controller.getWithdrawalRoutes();

    // Find USDC route
    const usdcAssetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.USDC.testnet
      : HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;

    return routes.find((route) => route.assetId === usdcAssetId);
  }, [isTestnet]);

  // Validation checks
  const hasInsufficientBalance = useMemo(() => {
    if (!withdrawAmount || !availableBalance) return false;
    return (
      Number.parseFloat(withdrawAmount) > Number.parseFloat(availableBalance)
    );
  }, [withdrawAmount, availableBalance]);

  const isBelowMinimum = useMemo(() => {
    if (!withdrawAmount) return false;
    const minAmount = Number.parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
    );
    return Number.parseFloat(withdrawAmount) < minAmount;
  }, [withdrawAmount, withdrawalRoute]);

  const hasAmount = withdrawAmount && Number.parseFloat(withdrawAmount) > 0;

  // Button label helper
  const getButtonLabel = () => {
    if (hasInsufficientBalance)
      return strings('perps.withdrawal.insufficient_funds');
    if (isBelowMinimum) {
      const minAmount = Number.parseFloat(
        withdrawalRoute?.constraints?.minAmount ||
          WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
      );
      return strings('perps.withdrawal.minimum_amount_error', {
        amount: minAmount,
      });
    }
    if (!withdrawAmount || Number.parseFloat(withdrawAmount) === 0)
      return strings('perps.withdrawal.enter_amount');
    return strings('perps.withdrawal.withdraw_usdc');
  };

  // Get minimum amount for display
  const getMinimumAmount = () =>
    Number.parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
    );

  return {
    availableBalance,
    withdrawalRoute,
    hasInsufficientBalance,
    isBelowMinimum,
    hasAmount,
    getButtonLabel,
    getMinimumAmount,
  };
};
