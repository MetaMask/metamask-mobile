export const MoneyPotentialEarningsViewTestIds = {
  CONTAINER: 'money-potential-earnings-view-container',
  SCROLL_VIEW: 'money-potential-earnings-view-scroll',
  BACK_BUTTON: 'money-potential-earnings-view-back-button',
  INFO_BUTTON: 'money-potential-earnings-view-info-button',
  CTA_BUTTON: 'money-potential-earnings-view-cta-button',
  DESCRIPTION: 'money-potential-earnings-view-description',
  TOKEN_ROW: (index: number) =>
    `money-potential-earnings-view-token-row-${index}` as const,
} as const;
