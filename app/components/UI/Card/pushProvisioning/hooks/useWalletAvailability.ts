/**
 * useWalletAvailability Hook
 *
 * Hook for checking mobile wallet availability and eligibility.
 * Currently only Android (Google Wallet) is supported.
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  UseWalletAvailabilityOptions,
  UseWalletAvailabilityReturn,
} from '../types';
import { getPushProvisioningService } from '../service';
import { strings } from '../../../../../../locales/i18n';

/**
 * Hook for checking mobile wallet availability
 *
 * This hook provides:
 * - Wallet availability status
 * - Eligibility information for adding cards
 * - The wallet type for the current platform
 *
 * Usage:
 * ```tsx
 * const { isAvailable, eligibility, walletType, checkAvailability } = useWalletAvailability({
 *   lastFourDigits: '1234',
 *   checkOnMount: true,
 * });
 *
 * if (isAvailable && eligibility?.canAddCard) {
 *   // Show add to wallet button
 * }
 * ```
 */
export function useWalletAvailability(
  options: UseWalletAvailabilityOptions = {},
): UseWalletAvailabilityReturn {
  const { lastFourDigits, checkOnMount = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [eligibility, setEligibility] = useState<WalletEligibility | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  // Determine wallet type based on platform
  const walletType: WalletType | null =
    Platform.OS === 'android' ? 'google_wallet' : null;

  /**
   * Check wallet availability and eligibility
   */
  const checkAvailability =
    useCallback(async (): Promise<WalletEligibility> => {
      setIsLoading(true);
      setError(null);

      try {
        const service = getPushProvisioningService();

        // Check basic availability
        const available = await service.isAvailable();
        setIsAvailable(available);

        // Log for debugging
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[useWalletAvailability] isAvailable:', available);
        }

        if (!available) {
          const result: WalletEligibility = {
            isAvailable: false,
            canAddCard: false,
            ineligibilityReason: strings(
              'card.push_provisioning.error_wallet_not_available',
            ),
          };
          setEligibility(result);
          return result;
        }

        // Check full eligibility
        const eligibilityResult =
          await service.checkEligibility(lastFourDigits);
        setEligibility(eligibilityResult);

        // Log for debugging
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(
            '[useWalletAvailability] eligibility:',
            eligibilityResult,
          );
        }

        return eligibilityResult;
      } catch (err) {
        const errorInstance =
          err instanceof Error ? err : new Error(String(err));
        setError(errorInstance);

        // Log for debugging
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[useWalletAvailability] error:', errorInstance.message);
        }

        const result: WalletEligibility = {
          isAvailable: false,
          canAddCard: false,
          ineligibilityReason: errorInstance.message,
        };
        setEligibility(result);

        return result;
      } finally {
        setIsLoading(false);
      }
    }, [lastFourDigits]);

  // Check availability on mount if requested
  useEffect(() => {
    if (checkOnMount) {
      checkAvailability();
    }
  }, [checkOnMount, checkAvailability]);

  return {
    isLoading,
    isAvailable,
    eligibility,
    walletType,
    checkAvailability,
    error,
  };
}
