import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';

/** Test ID for a recents or networks site tile, keyed by the site name. */
export const getSiteTileRowItemTestId = (siteName: string): string =>
  `${TrendingViewSelectorsIDs.SITE_RECENTS_TILE_PREFIX}${siteName}`;
