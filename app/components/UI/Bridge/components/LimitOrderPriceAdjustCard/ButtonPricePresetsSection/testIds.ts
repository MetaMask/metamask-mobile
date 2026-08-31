export const LimitOrderPriceAdjustPresetsSelectorsIDs = {
  CONTAINER: 'limit-order-price-adjust-presets',
  MARKET: 'limit-order-price-adjust-market-preset',
  CUSTOM: 'limit-order-price-adjust-custom-preset',
  CUSTOM_SLOT: 'limit-order-price-adjust-custom-slot',
  CUSTOM_INPUT: 'limit-order-price-adjust-custom-input',
} as const;

export const getLimitOrderPercentPresetTestId = (percent: number) =>
  `limit-order-price-adjust-percent-preset-${percent}`;

export type LimitOrderPriceAdjustPresetsSelectorsIDsType =
  typeof LimitOrderPriceAdjustPresetsSelectorsIDs;
