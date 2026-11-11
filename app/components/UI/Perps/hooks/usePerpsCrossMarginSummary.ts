import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsAccountSummary } from '@metamask/perps-controller';
import { selectPerpsCrossMarginEnabledFlag } from '../selectors/featureFlags';
import { usePerpsLiveAccount, usePerpsLivePositions } from './stream';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  getCrossMarginRatioTone,
  type CrossMarginRatioTone,
} from '../utils/crossMarginSummary';

export interface UsePerpsCrossMarginSummaryOptions {
  /** Whether to subscribe to account and position updates. */
  enabled?: boolean;
  /** Throttle for account updates (default: 1000ms). */
  throttleMs?: number;
}

export interface UsePerpsCrossMarginSummaryReturn extends PerpsAccountSummary {
  /** Whether the cross margin feature flag is on. */
  isCrossMarginEnabled: boolean;
  /** Whether the account holds cross margin exposure. */
  hasCrossExposure: boolean;
  /** Color tone for the account ratio. */
  tone?: CrossMarginRatioTone;
  /** Whether we're waiting for the first account update. */
  isInitialLoading: boolean;
}

/**
 * Live cross margin metrics for the selected perps account: account ratio,
 * maintenance margin, account leverage and cross margin usage.
 */
export const usePerpsCrossMarginSummary = (
  options: UsePerpsCrossMarginSummaryOptions = {},
): UsePerpsCrossMarginSummaryReturn => {
  const { enabled = true, throttleMs = 1000 } = options;
  const isCrossMarginEnabled = useSelector(selectPerpsCrossMarginEnabledFlag);
  const isActive = enabled && isCrossMarginEnabled;

  const { account, isInitialLoading } = usePerpsLiveAccount({
    enabled: isActive,
    throttleMs,
  });
  const { positions } = usePerpsLivePositions({
    enabled: isActive,
    throttleMs,
  });

  const hasCrossPosition = useMemo(
    () => positions.some((position) => position.leverage?.type === 'cross'),
    [positions],
  );

  return useMemo(() => {
    const summary = calculateCrossMarginAccountSummaryFromAccount(
      isActive ? account : null,
    );
    const hasMaintenanceMargin =
      summary.maintenanceMargin !== undefined && summary.maintenanceMargin > 0;
    const hasCrossExposure =
      isActive && (hasCrossPosition || hasMaintenanceMargin);

    return {
      ...summary,
      isCrossMarginEnabled,
      hasCrossExposure,
      tone: getCrossMarginRatioTone(summary.accountRatio),
      isInitialLoading,
    };
  }, [
    account,
    hasCrossPosition,
    isActive,
    isCrossMarginEnabled,
    isInitialLoading,
  ]);
};
