import type { SwapsLimitOrderExpirationMinutes } from '../../constants/limitOrders';

export interface SwapsLimitOrderExpirationModalParams {
  /**
   * Currently committed expiration, in minutes, used as the initial selection.
   */
  selectedMinutes: SwapsLimitOrderExpirationMinutes;
  /**
   * Fired as soon as the user taps an expiration option. The parent owns the committed value.
   */
  onSelect: (minutes: SwapsLimitOrderExpirationMinutes) => void;
}

export interface SwapsLimitOrderExpirationModalProps {
  /**
   * Currently selected expiration, in minutes.
   */
  selectedMinutes: SwapsLimitOrderExpirationMinutes;
  /**
   * Fired when the user taps an expiration option.
   */
  onSelect: (minutes: SwapsLimitOrderExpirationMinutes) => void;
  /**
   * Fired when the sheet is dismissed. Used by tests and non-navigation hosts.
   */
  onClose?: () => void;
  /**
   * Pops the Bridge modal route when the sheet closes.
   */
  goBack?: () => void;
  /**
   * Optional test ID for the sheet container.
   */
  testID?: string;
}
