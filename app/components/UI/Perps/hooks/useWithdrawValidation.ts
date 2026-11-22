import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import {
  WITHDRAWAL_CONSTANTS,
  type AssetRoute,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import {
  parseCurrencyString,
  truncateToTwoDecimals,
} from '../utils/formatUtils';
import { usePerpsConnection } from './index';
import { usePerpsLiveAccount } from './stream';

interface UseWithdrawValidationParams {
  withdrawAmount: string;
  providerId?: PerpsProviderType;
}

/**
 * Withdrawal route the controller reports for the venue.
 * Direct-provider routes carry no `providerId` and match any venue.
 *
 * @param providerId - Venue the withdrawal signs on.
 * @returns The route, or undefined until the controller is initialized.
 */
export const useWithdrawalRoute = (
  providerId?: PerpsProviderType,
): AssetRoute | undefined => {
  const { isInitialized } = usePerpsConnection();
  // Routes are network-specific; a network switch re-initializes the
  // controller, which recomputes them.
  return useMemo(() => {
    if (!isInitialized) return undefined;
    return Engine.context.PerpsController.getWithdrawalRoutes().find(
      (route) =>
        route.providerId === providerId || route.providerId === undefined,
    );
  }, [isInitialized, providerId]);
};

/**
 * Hook to handle withdrawal validation logic
 * @param params - The withdrawal amount to validate
 * @returns Validation states and helper functions
 */
export const useWithdrawValidation = ({
  withdrawAmount,
  providerId,
}: UseWithdrawValidationParams) => {
  const { account } = usePerpsLiveAccount({ providerId });
  const { isInitialized } = usePerpsConnection();
  const withdrawalRoute = useWithdrawalRoute(providerId);

  // Truncate to 2 decimal places so validation matches the displayed balance.
  const withdrawableBalance = useMemo(() => {
    const balance = account?.withdrawableBalance || '0';
    return truncateToTwoDecimals(parseCurrencyString(balance)).toString();
  }, [account]);

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
    isLoadingRoute: !isInitialized,
    hasInsufficientBalance,
    isBelowMinimum,
    hasAmount,
    getButtonLabel,
    getMinimumAmount,
  };
};
