import type { SwapsLimitOrderExpirationMinutes } from '../../constants/limitOrders';

export const SwapsLimitOrderExpirationModalSelectorsIDs = {
  SHEET: 'swaps-limit-order-expiration-modal',
  CLOSE_BUTTON: 'swaps-limit-order-expiration-modal-close',
  OPTION: (minutes: SwapsLimitOrderExpirationMinutes) =>
    `swaps-limit-order-expiration-option-${minutes}`,
} as const;
