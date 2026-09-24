import type { TradeAllowanceItem } from '../../ProHub.constants';

export const MemberPricingOnTradesTestIds = {
  SECTION: 'pro-hub-member-pricing-section',
  TITLE: 'pro-hub-member-pricing-title',
  ROW: (id: TradeAllowanceItem['id']) => `pro-hub-member-pricing-row-${id}`,
  PROGRESS: (id: TradeAllowanceItem['id']) =>
    `pro-hub-member-pricing-progress-${id}`,
  PROGRESS_FILL: (id: TradeAllowanceItem['id']) =>
    `pro-hub-member-pricing-progress-fill-${id}`,
} as const;
