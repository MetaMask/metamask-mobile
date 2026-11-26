import { isFiatOrderDeclineError } from './isFiatOrderDeclineError';

describe('isFiatOrderDeclineError', () => {
  it.each([
    'Fiat order failed',
    'MetaMask Pay: Fiat: Fiat order failed',
    'Fiat: Fiat order cancelled',
    'MetaMask Pay: Fiat: Fiat order id_expired',
    'fiat order FAILED',
  ])('returns true for "%s"', (message) => {
    expect(isFiatOrderDeclineError(message)).toBe(true);
  });

  it.each([
    undefined,
    '',
    'Fiat order polling timed out (last status: PENDING)',
    'MetaMask Pay: Fiat: Missing order ID',
    'Deposit failed',
  ])('returns false for %s', (message) => {
    expect(isFiatOrderDeclineError(message)).toBe(false);
  });
});
