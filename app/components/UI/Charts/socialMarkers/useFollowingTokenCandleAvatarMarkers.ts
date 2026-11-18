import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectChartSocialMarkersEnabled } from '../../../../selectors/featureFlagController/chartSocialMarkers';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import { useFollowingTokenPositions } from './useFollowingTokenPositions';
import { mapFollowingPositionsToCandleAvatarMarkers } from './mapFollowingPositionsToCandleAvatarMarkers';
import type { MapFollowingPositionsOptions } from './mapFollowingPositionsToAvatarMarkers';
import { useResolvedAvatarMarkers } from './useResolvedAvatarMarkers';

/**
 * Candlestick-chart entry point: resolves the followed-traders avatar markers
 * for a token as timestamp-anchored {@link AvatarMarker}s, gated behind the
 * Chart Social Markers feature flag. Returns an empty array when the flag is
 * off, the user is locked, or no followed trader holds the token. Memoized so
 * chart pan/zoom re-renders don't re-map the set.
 */
export const useFollowingTokenCandleAvatarMarkers = (
  assetId: string,
  options?: MapFollowingPositionsOptions,
): AvatarMarker[] => {
  const isEnabled = useSelector(selectChartSocialMarkersEnabled);
  const { data } = useFollowingTokenPositions(assetId, { enabled: isEnabled });
  const maxMarkers = options?.maxMarkers;

  const markers = useMemo(() => {
    if (!isEnabled) return [];
    return mapFollowingPositionsToCandleAvatarMarkers(data, { maxMarkers });
  }, [isEnabled, data, maxMarkers]);

  // Resolve remote avatar URLs to data URIs on the RN side so the WebView never
  // fetches a remote host (keeps the chart CSP tight — no external img-src).
  return useResolvedAvatarMarkers(markers);
};

export default useFollowingTokenCandleAvatarMarkers;
