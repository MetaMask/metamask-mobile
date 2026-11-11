/**
 * The API refused to cancel the order because it is no longer open: it is
 * being executed, or has already filled, expired or failed (`409`). Trying
 * again cannot help. An order that is already cancelled does not raise this,
 * since the API returns it unchanged.
 */
export class LimitOrderNotOpenError extends Error {
  constructor() {
    super('cancelLimitOrder: Only open orders can be cancelled');
    this.name = 'LimitOrderNotOpenError';
  }
}
