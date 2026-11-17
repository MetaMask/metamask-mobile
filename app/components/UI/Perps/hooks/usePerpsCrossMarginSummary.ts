import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsAccountSummary } from '@metamask/perps-controller';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { selectPerpsCrossMarginEnabledFlag } from '../selectors/featureFlags';
import { usePerpsLiveAccount, usePerpsLivePositions } from './stream';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  getCrossMarginRatioTone,
  getCrossMarginSummaryThrottleMs,
  type CrossMarginRatioTone,
} from '../utils/crossMarginSummary';
import { CROSS_MARGIN_SUMMARY_THROTTLE_MS } from '../constants/perpsConfig';

export interface UsePerpsCrossMarginSummaryOptions {
  /** Whether to subscribe to account and position updates. */
  enabled?: boolean;
  /**
   * Throttle for account and position updates on a product-default
   * connection (default: `CROSS_MARGIN_SUMMARY_THROTTLE_MS`). A 2G or 3G
   * connection raises it.
   */
  throttleMs?: number;
}

export interface UsePerpsCrossMarginSummaryReturn extends PerpsAccountSummary {
  /** Whether the cross margin feature flag is on. */
  isCrossMarginEnabled: boolean;
  /** Whether the account holds cross margin exposure. */
  hasCrossExposure: boolean;
  /** Color tone for the account ratio. */
  tone?: CrossMarginRatioTone;
}

/**
 * Live cross margin metrics for the selected perps account: account ratio,
 * maintenance margin, account leverage and cross margin usage.
 */
export const usePerpsCrossMarginSummary = (
  options: UsePerpsCrossMarginSummaryOptions = {},
): UsePerpsCrossMarginSummaryReturn => {
  const { enabled = true, throttleMs = CROSS_MARGIN_SUMMARY_THROTTLE_MS } =
    options;
  const isCrossMarginEnabled = useSelector(selectPerpsCrossMarginEnabledFlag);
  const isActive = enabled && isCrossMarginEnabled;
  // UX matrix (app/util/deviceCapability/README.md): the tiers are read
  // separately, and a `null` tier keeps the product default.
  const networkTier = useNetworkTier();
  const streamThrottleMs = getCrossMarginSummaryThrottleMs({
    throttleMs,
    hardwareTier: getHardwareTier(),
    networkTier,
  });

  const { account } = usePerpsLiveAccount({
    enabled: isActive,
    throttleMs: streamThrottleMs,
  });
  const { positions } = usePerpsLivePositions({
    enabled: isActive,
    throttleMs: streamThrottleMs,
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
    };
  }, [account, hasCrossPosition, isActive, isCrossMarginEnabled]);
};
