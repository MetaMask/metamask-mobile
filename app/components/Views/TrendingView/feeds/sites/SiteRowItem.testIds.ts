const SITE_ROW_ITEM_TEST_ID_PREFIX = 'site-row-item-';

/** Test ID for a site row, keyed by the site name. */
export const getSiteRowItemTestId = (siteName: string): string =>
  `${SITE_ROW_ITEM_TEST_ID_PREFIX}${siteName}`;
