import type { TokenDetailsV1TabKey } from './constants/constants';

const TAB_CONTENT = 'token-details-v1-tab-content';

export const TokenDetailsIds = {
  header: {
    subtitle: 'token-details-subtitle',
    ticker: 'token-details-ticker',
    address: 'token-details-address',
    copyAddressButton: 'copy-contract-address-button',
  },
  v1: 'token-details-v1',
  scrollView: 'token-details-v1-scroll-view',
  tabPanelPrefix: 'token-details-v1-tab-panel',
  tabContent: TAB_CONTENT,
  tabBar: 'token-details-v1-tab-bar',
  ageChip: 'token-details-v1-age-chip',
  pending: 'token-details-page-pending',
  tab: (tab: TokenDetailsV1TabKey) => `token-details-v1-tab-${tab}`,
  tabPage: (tab: TokenDetailsV1TabKey) => `${TAB_CONTENT}-page-${tab}`,
  overview: {
    container: 'token-details-overview-tab',
    description: 'token-details-overview-tab-description',
    balance: 'token-details-overview-tab-balance',
    tokenDetails: 'token-details-overview-tab-token-details',
    sectionRule: 'token-details-overview-section-rule',
    performance: 'token-details-overview-tab-performance',
  },
  /** Whole feed card, pressable while Social terms are not accepted. */
  feedPostOnboardingPress: (postId: string) =>
    `token-details-feed-post-onboarding-press-${postId}`,
  holderRow: {
    CONTAINER: 'token-holder-row',
    PRESS: 'token-holder-row-press',
    NAME: 'token-holder-row-name',
    FOLLOWERS: 'token-holder-row-followers',
    POSITION_VALUE: 'token-holder-row-position-value',
    PNL_PERCENT: 'token-holder-row-pnl-percent',
  },
};
