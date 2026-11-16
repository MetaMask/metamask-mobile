import React from 'react';
import PriceChart, { type PriceChartProps } from './PriceChart';
import { useFollowingTokenAvatarMarkers } from '../../Charts/socialMarkers/useFollowingTokenAvatarMarkers';

export interface LinePriceChartWithSocialMarkersProps extends PriceChartProps {
  /** CAIP-19 asset id used to fetch followed-trader positions. */
  assetId: string;
}

/**
 * Line chart with follower avatar markers (ASSETS-4102).
 *
 * Mounted only when the Chart Social Markers feature flag is on, so the
 * `useQuery`-backed data hook never runs (and never needs a QueryClient) when
 * the feature is disabled. Keeps `PriceChart` free of the social dependency.
 */
const LinePriceChartWithSocialMarkers = ({
  assetId,
  ...priceChartProps
}: LinePriceChartWithSocialMarkersProps) => {
  const avatarMarkers = useFollowingTokenAvatarMarkers(
    assetId,
    priceChartProps.prices,
  );

  return <PriceChart {...priceChartProps} avatarMarkers={avatarMarkers} />;
};

export default LinePriceChartWithSocialMarkers;
