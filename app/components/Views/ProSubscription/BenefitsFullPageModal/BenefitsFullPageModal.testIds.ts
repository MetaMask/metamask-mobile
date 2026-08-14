export const BenefitsFullPageModalTestIds = {
  CONTAINER: 'benefits-full-page-modal-container',
  CLOSE_BUTTON: 'benefits-full-page-modal-close-button',
  TITLE: 'benefits-full-page-modal-title',
  PRICE_LINE: 'benefits-full-page-modal-price-line',
  SAVE_BADGE: 'benefits-full-page-modal-save-badge',
  BENEFIT_ROW: (id: string) => `benefits-full-page-modal-benefit-row-${id}`,
  PLAN_CARD: (planId: string) => `benefits-full-page-modal-plan-card-${planId}`,
  CTA_BUTTON: 'benefits-full-page-modal-cta-button',
} as const;
