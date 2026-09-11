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
  PRICING_UNAVAILABLE: 'benefits-pricing-unavailable',
  PRICING_MALFORMED: 'benefits-pricing-malformed',
  PRICING_RETRY_BUTTON: 'benefits-pricing-retry-button',
  PLAN_CARD_PRICE: (planId: string) => `benefits-plan-card-${planId}-price`,
  PLAN_CARD_SUB_PRICE: (planId: string) =>
    `benefits-plan-card-${planId}-sub-price`,
  PLAN_CARD_SAVINGS_BADGE: (planId: string) =>
    `benefits-plan-card-${planId}-savings-badge`,
  PLAN_CARD_TRIAL: (planId: string) => `benefits-plan-card-${planId}-trial`,
} as const;
