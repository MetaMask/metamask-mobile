export const MoneySplashViewTestIds = {
  CONTAINER: 'money-splash-view-container',
  HERO: 'money-splash-view-hero',
  EYEBROW: 'money-splash-view-eyebrow',
  TITLE: 'money-splash-view-title',
  BODY: 'money-splash-view-body',
  BENEFIT_ROW: (n: number) => `money-splash-view-benefit-${n}`,
  CTA: 'money-splash-view-cta',
  CLOSE_BUTTON: 'money-splash-view-close',
  FAQ_TITLE: 'money-splash-view-faq-title',
  FAQ_ITEM: (n: number) => `money-splash-view-faq-item-${n}`,
  FAQ_LINK: 'money-splash-view-faq-link',
} as const;
