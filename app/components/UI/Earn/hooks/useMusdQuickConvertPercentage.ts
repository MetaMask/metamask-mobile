import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import { selectMusdQuickConvertPercentage } from '../selectors/featureFlags';
import { strings } from '../../../../../locales/i18n';

/**
 * Return type for the useMusdQuickConvertPercentage hook.
 */
export interface MusdQuickConvertPercentageResult {
  /** The percentage value (0-1 range) */
  percentage: number;
  /** Whether we're in max mode (percentage === 1) */
  isMaxMode: boolean;
  /** The button label to display ("Max" or formatted percentage like "90%") */
  buttonLabel: string;
  /** Applies the percentage to a raw balance (hex string) and returns the adjusted amount */
  applyPercentage: (rawBalance: Hex) => Hex;
}

/**
 * Hook for managing mUSD Quick Convert percentage logic.
 *
 * This hook provides utilities for:
 * - Getting the configured percentage from the feature flag
 * - Determining if we're in max mode (100%) or percentage mode
 * - Getting the appropriate button label
 * - Applying the percentage to a raw balance
 *
 * @example
 * const { percentage, isMaxMode, buttonLabel, applyPercentage } = useMusdQuickConvertPercentage();
 *
 * // In button:
 * <Button>{buttonLabel}</Button>
 *
 * // When creating transaction:
 * const adjustedBalance = applyPercentage(token.rawBalance);
 */
export const useMusdQuickConvertPercentage =
  (): MusdQuickConvertPercentageResult => {
    const percentage = useSelector(selectMusdQuickConvertPercentage);

    const isMaxMode = percentage === 1;

    const buttonLabel = useMemo(() => {
      if (isMaxMode) {
        return strings('earn.musd_conversion.max');
      }
      // Convert decimal to percentage (e.g., 0.90 -> "90%")
      return `${Math.round(percentage * 100)}%`;
    }, [isMaxMode, percentage]);

    const applyPercentage = useCallback(
      (rawBalance: Hex): Hex => {
        if (isMaxMode) {
          return rawBalance;
        }

        // Convert hex to BigNumber, apply percentage, and convert back to hex
        const balanceBN = new BigNumber(rawBalance);
        const adjustedBalance = balanceBN
          .multipliedBy(percentage)
          .integerValue(BigNumber.ROUND_DOWN);

        return toHex(adjustedBalance) as Hex;
      },
      [isMaxMode, percentage],
    );

    return {
      percentage,
      isMaxMode,
      buttonLabel,
      applyPercentage,
    };
  };

