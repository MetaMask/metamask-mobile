/**
 * How a cancellation that went through ended.
 */
export enum CancelLimitOrderOutcome {
  /**
   * The order is cancelled, by this request or an earlier one.
   */
  Cancelled = 'cancelled',
  /**
   * The order was no longer open, e.g. it had already filled, so it was left
   * as it was.
   */
  NotOpen = 'notOpen',
}
