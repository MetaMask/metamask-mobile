import type { TokenDetailsV1TabKey } from '../constants/constants';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';
export const TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID =
  'token-details-v1-scroll-view';
export const TOKEN_DETAILS_V1_TAB_PANEL_TEST_ID_PREFIX =
  'token-details-v1-tab-panel';
export const TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID =
  'token-details-v1-tab-content';

export const tokenDetailsV1TabPageTestId = (
  tab: TokenDetailsV1TabKey,
): string => `${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-${tab}`;
