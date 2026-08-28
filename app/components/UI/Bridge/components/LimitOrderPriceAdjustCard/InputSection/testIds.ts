export const LimitOrderPriceAdjustInputSectionSelectorsIDs = {
  CONTAINER: 'limit-order-price-adjust-input-section',
  QUOTE_UNIT: 'limit-order-price-adjust-quote-unit',
  INPUT: 'limit-order-price-adjust-input',
  AMOUNT_TYPE_TOGGLE: 'limit-order-price-adjust-amount-type-toggle',
  SECONDARY_VALUE: 'limit-order-price-adjust-secondary-value',
  MARKET_COMPARISON: 'limit-order-price-adjust-market-comparison',
} as const;

export type LimitOrderPriceAdjustInputSectionSelectorsIDsType =
  typeof LimitOrderPriceAdjustInputSectionSelectorsIDs;
