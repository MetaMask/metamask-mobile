const SITE_TILE_ROW_ITEM_TEST_ID_PREFIX = 'site-recents-tile-';

/** Test ID for a recents or networks site tile, keyed by the site name. */
export const getSiteTileRowItemTestId = (siteName: string): string =>
  `${SITE_TILE_ROW_ITEM_TEST_ID_PREFIX}${siteName}`;
