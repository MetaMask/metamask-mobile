import { BenefitRowTestIds } from '../../../shared/pro';

export const BenefitsTestIds = {
  CONTAINER: 'benefits-container',
  TITLE: 'benefits-title',
  PRICE_LINE: 'benefits-price-line',
  BENEFIT_ROW: BenefitRowTestIds.ROW,
  PLAN_CARD: (planId: string) => `benefits-plan-card-${planId}`,
  PLAN_CARD_SKELETON: 'benefits-plan-card-skeleton',
  CTA_BUTTON: 'benefits-cta-button',
  BENEFIT_DETAILS_CONTAINER: 'benefits-details-container',
  PRICING_LOADING: 'benefits-pricing-loading',
  PRICING_ERROR: 'benefits-pricing-error',
  PRICING_RETRY_BUTTON: 'benefits-pricing-retry-button',
} as const;
