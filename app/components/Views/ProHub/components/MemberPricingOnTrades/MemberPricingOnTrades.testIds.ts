import type { TradeAllowanceItem } from '../../ProHub.constants';

export const MemberPricingOnTradesTestIds = {
  SECTION: 'pro-hub-member-pricing-section',
  TITLE: 'pro-hub-member-pricing-title',
  LOADING_SKELETON: 'pro-hub-member-pricing-loading-skeleton',
  ERROR: 'pro-hub-member-pricing-error',
  RETRY_BUTTON: 'pro-hub-member-pricing-retry-button',
  RESETS_ON: 'pro-hub-member-pricing-resets-on',
  ROW: (id: TradeAllowanceItem['id']) => `pro-hub-member-pricing-row-${id}`,
  PROGRESS: (id: TradeAllowanceItem['id']) =>
    `pro-hub-member-pricing-progress-${id}`,
  PROGRESS_FILL: (id: TradeAllowanceItem['id']) =>
    `pro-hub-member-pricing-progress-fill-${id}`,
} as const;
