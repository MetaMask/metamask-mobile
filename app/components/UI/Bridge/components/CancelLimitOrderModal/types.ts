import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';

/**
 * Route params for the cancel limit order modal, opened from the open limit
 * order details sheet.
 */
export interface CancelLimitOrderModalParams {
  /**
   * The order to cancel.
   */
  order: LimitOrder;
}

export interface CancelLimitOrderModalProps {
  /**
   * Fired when the confirm button is pressed, including when it retries a
   * cancellation that failed. The host sends the cancellation and closes the
   * sheet once it goes through.
   */
  onConfirm: () => void;
  /**
   * Whether the cancellation is in flight. The confirm button shows a spinner
   * and ignores presses meanwhile.
   */
  isCancelling?: boolean;
  /**
   * Why the last cancellation failed. When set, it is shown in a banner and
   * the confirm button reads "Try again".
   */
  error?: string;
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
