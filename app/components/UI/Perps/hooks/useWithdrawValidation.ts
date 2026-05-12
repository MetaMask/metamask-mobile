import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  WITHDRAWAL_CONSTANTS,
} from '@metamask/perps-controller';
import {
  parseCurrencyString,
  truncateToTwoDecimals,
} from '../utils/formatUtils';
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

  // Truncate to 2 decimal places so validation matches the displayed balance.
  const withdrawableBalance = useMemo(() => {
    const balance = account?.withdrawableBalance || '0';
    return truncateToTwoDecimals(parseCurrencyString(balance)).toString();
  }, [account]);

  // Get withdrawal route for constraints
  const withdrawalRoute = useMemo(() => {
    const controller = Engine.context.PerpsController;
    const routes = controller.getWithdrawalRoutes();

    // Find USDC route
    const usdcAssetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.usdc.testnet
      : HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet;

    return routes.find((route) => route.assetId === usdcAssetId);
  }, [isTestnet]);

  // Validation checks
  const hasInsufficientBalance = useMemo(() => {
    if (!withdrawAmount || !withdrawableBalance) return false;
    return (
      Number.parseFloat(withdrawAmount) > Number.parseFloat(withdrawableBalance)
    );
  }, [withdrawAmount, withdrawableBalance]);

  const isBelowMinimum = useMemo(() => {
    if (!withdrawAmount) return false;
    const minAmount = Number.parseFloat(
      withdrawalRoute?.constraints?.minAmount ||
        WITHDRAWAL_CONSTANTS.DefaultMinAmount,
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
          WITHDRAWAL_CONSTANTS.DefaultMinAmount,
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
        WITHDRAWAL_CONSTANTS.DefaultMinAmount,
    );

  return {
    withdrawableBalance,
    withdrawalRoute,
    hasInsufficientBalance,
    isBelowMinimum,
    hasAmount,
    getButtonLabel,
    getMinimumAmount,
  };
};
