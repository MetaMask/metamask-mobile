import type { TokenDetailsV1TabKey } from '../constants/constants';

export const TOKEN_DETAILS_V1_TAB_BAR_TEST_ID = 'token-details-v1-tab-bar';

export const getTokenDetailsV1TabTestId = (tab: TokenDetailsV1TabKey): string =>
  `token-details-v1-tab-${tab}`;
