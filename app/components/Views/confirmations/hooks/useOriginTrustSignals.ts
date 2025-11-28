import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RecommendedAction } from '@metamask/phishing-controller';
import { selectUrlScanResult } from '../../../../selectors/phishingController';
import { RootState } from '../../../../reducers';
import {
  TrustSignalDisplayState,
  TrustSignalResult,
} from '../types/trustSignals';
import { getHost } from '../../../../util/browser';

/**
 * Get the trust signal display state from a recommended action
 *
 * @param recommendedAction - The recommended action from the scan result
 * @returns The trust signal display state
 */
function getTrustState(
  recommendedAction: RecommendedAction | undefined,
): TrustSignalDisplayState {
  if (!recommendedAction) {
    return TrustSignalDisplayState.Unknown;
  }

  switch (recommendedAction) {
    case RecommendedAction.Block:
      return TrustSignalDisplayState.Malicious;
    case RecommendedAction.Warn:
      return TrustSignalDisplayState.Warning;
    case RecommendedAction.Verified:
      return TrustSignalDisplayState.Verified;
    case RecommendedAction.None:
    default:
      return TrustSignalDisplayState.Unknown;
  }
}

/**
 * Hook to get trust signals for an origin URL.
 *
 * @param origin - The origin URL to check
 * @returns Trust signal result with state and null label since we don't display a label for origins
 */
export function useOriginTrustSignals(
  origin: string | undefined,
): TrustSignalResult {
  const hostname = useMemo(() => {
    if (!origin) {
      return undefined;
    }
    return getHost(origin.toLowerCase());
  }, [origin]);

  const urlScanResult = useSelector((state: RootState) =>
    selectUrlScanResult(state, { hostname }),
  );

  const state = useMemo(
    () => getTrustState(urlScanResult?.scanResult?.recommendedAction),
    [urlScanResult],
  );

  return {
    state,
    label: null,
  };
}
