import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectChartSocialMarkersEnabled } from '../../../../selectors/featureFlagController/chartSocialMarkers';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import { useFollowingTokenPositions } from './useFollowingTokenPositions';
import {
  mapFollowingPositionsToCandleAvatarMarkersWithLookup,
  type CandleAvatarMarkerLookup,
} from './mapFollowingPositionsToCandleAvatarMarkers';
import type { MapFollowingPositionsOptions } from './mapFollowingPositionsToAvatarMarkers';
import { useResolvedAvatarMarkers } from './useResolvedAvatarMarkers';

/** Avatar markers for the chart overlay plus the id→trade lookup the bottom
 * sheet renders from when a marker/cluster is tapped. */
export interface FollowingTokenCandleAvatarMarkers {
  markers: AvatarMarker[];
  byId: CandleAvatarMarkerLookup;
}

/**
 * Candlestick-chart entry point: resolves the followed-traders avatar markers
 * for a token as timestamp-anchored {@link AvatarMarker}s, gated behind the
 * Chart Social Markers feature flag. Also returns a `byId` lookup from marker
 * id to its originating trade so a marker/cluster tap can open a bottom sheet.
 * Returns empty values when the flag is off, the user is locked, or no followed
 * trader holds the token. Memoized so chart pan/zoom re-renders don't re-map.
 */
export const useFollowingTokenCandleAvatarMarkers = (
  assetId: string,
  options?: MapFollowingPositionsOptions,
): FollowingTokenCandleAvatarMarkers => {
  const isEnabled = useSelector(selectChartSocialMarkersEnabled);
  const { data } = useFollowingTokenPositions(assetId, { enabled: isEnabled });
  const maxMarkers = options?.maxMarkers;

  const { markers, byId } = useMemo(() => {
    if (!isEnabled) return { markers: [], byId: {} };
    return mapFollowingPositionsToCandleAvatarMarkersWithLookup(data, {
      maxMarkers,
    });
  }, [isEnabled, data, maxMarkers]);

  // Resolve remote avatar URLs to data URIs on the RN side so the WebView never
  // fetches a remote host (keeps the chart CSP tight — no external img-src).
  const resolvedMarkers = useResolvedAvatarMarkers(markers);

  return useMemo(
    () => ({ markers: resolvedMarkers, byId }),
    [resolvedMarkers, byId],
  );
};

export default useFollowingTokenCandleAvatarMarkers;
