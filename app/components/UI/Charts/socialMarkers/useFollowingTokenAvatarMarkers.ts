import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectChartSocialMarkersEnabled } from '../../../../selectors/featureFlagController/chartSocialMarkers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { useFollowingTokenPositions } from './useFollowingTokenPositions';
import {
  mapFollowingPositionsToAvatarMarkers,
  type AvatarTradeMarker,
  type MapFollowingPositionsOptions,
} from './mapFollowingPositionsToAvatarMarkers';

/**
 * Line-chart entry point: resolves the followed-traders avatar markers for a
 * token, gated behind the Chart Social Markers feature flag. Returns an empty
 * array when the flag is off, the user is locked, or no followed trader holds
 * the token. Memoized so chart scrub re-renders don't re-map the series.
 */
export const useFollowingTokenAvatarMarkers = (
  assetId: string,
  prices: readonly TokenPrice[],
  options?: MapFollowingPositionsOptions,
): AvatarTradeMarker[] => {
  const isEnabled = useSelector(selectChartSocialMarkersEnabled);
  const { data } = useFollowingTokenPositions(assetId, { enabled: isEnabled });
  const maxMarkers = options?.maxMarkers;

  return useMemo(() => {
    if (!isEnabled) return [];
    return mapFollowingPositionsToAvatarMarkers(data, prices, { maxMarkers });
  }, [isEnabled, data, prices, maxMarkers]);
};

export default useFollowingTokenAvatarMarkers;
