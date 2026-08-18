export const BenefitsTestIds = {
  CONTAINER: 'benefits-container',
  CLOSE_BUTTON: 'benefits-close-button',
  TITLE: 'benefits-title',
  PRICE_LINE: 'benefits-price-line',
  SAVE_BADGE: 'benefits-save-badge',
  BENEFIT_ROW: (id: string) => `benefits-benefit-row-${id}`,
  PLAN_CARD: (planId: string) => `benefits-plan-card-${planId}`,
  CTA_BUTTON: 'benefits-cta-button',
} as const;
