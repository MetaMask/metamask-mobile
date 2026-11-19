import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyRebateQuoteError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services';
import {
  getRebateQuoteRetryDelay,
  retryRebateQuote,
} from './useRebateQuoteQuery';

describe('retryRebateQuote', () => {
  it('retries the first unavailable response', () => {
    const error = new RewardsMoneyRebateQuoteError(
      503,
      'UNAVAILABLE',
      'Server busy',
      2,
    );

    const retry = retryRebateQuote(0, error);

    expect(retry).toBe(true);
  });

  it('does not retry authorization failures', () => {
    const error = new RewardsMoneyAuthorizationError('Unauthorized');

    const retry = retryRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('does not retry invalid request failures', () => {
    const error = new RewardsMoneyRebateQuoteError(
      400,
      'INVALID_REQUEST',
      'Bad trade',
    );

    const retry = retryRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('retries rate-limited responses', () => {
    const error = new RewardsMoneyRebateQuoteError(
      429,
      'RATE_LIMITED',
      'Rate limited',
    );

    expect(retryRebateQuote(0, error)).toBe(true);
  });

  it('does not retry terminal not-found responses', () => {
    const error = new RewardsMoneyRebateQuoteError(404, 'FAILED', 'Not found');

    const retry = retryRebateQuote(0, error);

    expect(retry).toBe(false);
  });

  it('stops after one retry', () => {
    const retry = retryRebateQuote(1, new Error('Network failure'));

    expect(retry).toBe(false);
  });
});

describe('getRebateQuoteRetryDelay', () => {
  it('uses the server retry delay', () => {
    const error = new RewardsMoneyRebateQuoteError(
      429,
      'RATE_LIMITED',
      'Rate limited',
      12,
    );

    const delay = getRebateQuoteRetryDelay(0, error);

    expect(delay).toBe(12_000);
  });

  it('uses the fallback delay without a Retry-After value', () => {
    const error = new RewardsMoneyRebateQuoteError(
      503,
      'UNAVAILABLE',
      'Server busy',
    );

    expect(getRebateQuoteRetryDelay(0, error)).toBe(1_000);
  });
});
