import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import type { TradingHubAvailability } from './tradeHubRoutes';

/**
 * Same default as Predict's flag: missing or invalid remote config stays on,
 * which matches when the Predictions root is registered.
 */
const isPredictTradingEnabled = (remoteFlag: unknown): boolean => {
  if (typeof remoteFlag !== 'object' || remoteFlag === null) {
    return true;
  }

  const flag =
    'enabled' in remoteFlag
      ? remoteFlag
      : 'value' in remoteFlag &&
          typeof (remoteFlag as { value?: unknown }).value === 'object'
        ? (remoteFlag as { value?: unknown }).value
        : undefined;

  if (typeof flag !== 'object' || flag === null) {
    return true;
  }

  return (
    validatedVersionGatedFeatureFlag(flag as VersionGatedFeatureFlag) ?? true
  );
};

/** Whether the real Perps and Predictions roots are registered. */
export const useTradingHubAvailability = (): TradingHubAvailability => {
  const perpsFlag = useSelector(selectPerpsEnabledFlag);
  const predictFlag = useSelector(selectRemoteFeatureFlags);

  return useMemo(
    () => ({
      perps: Boolean(perpsFlag),
      predictions: isPredictTradingEnabled(predictFlag?.predictTradingEnabled),
    }),
    [perpsFlag, predictFlag],
  );
};
