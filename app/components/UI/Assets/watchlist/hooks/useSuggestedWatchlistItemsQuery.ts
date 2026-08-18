import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type UseQueryResult } from '@tanstack/react-query';

import { getDetectedGeolocation } from '../../../../../reducers/fiatOrders';
import { type WatchlistTokenWithBalance } from '../utils/addBalanceToTokens';
import {
  getDefaultWatchlistAssetIds,
  isSpaceXDefaultEligible,
} from '../utils/defaultWatchlistGeo';
import { useTokenWatchlistQuery } from './useTokenWatchlistQuery';

export { DEFAULT_WATCHLIST_BASE_ASSET_IDS } from '../constants/defaultWatchlistTokens';

/**
 * Hydrates curated default watchlist tokens for the empty-state CTA.
 * Geo-aware: eligible users receive SpaceX as a 6th default.
 */
export const useSuggestedWatchlistItemsQuery = (): UseQueryResult<
  WatchlistTokenWithBalance[],
  Error
> => {
  const geolocation = useSelector(getDetectedGeolocation);
  const includeSpaceX = isSpaceXDefaultEligible(geolocation);

  const suggestedTokens = useMemo(
    () => getDefaultWatchlistAssetIds(geolocation),
    [geolocation],
  );

  return useTokenWatchlistQuery({
    suggestedTokens,
    suggestedIncludeSpaceX: includeSpaceX,
  });
};
