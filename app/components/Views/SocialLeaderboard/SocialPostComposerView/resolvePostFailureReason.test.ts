import { CreateSwapCommentTimeoutError } from './createSwapCommentTimeout';
import { resolvePostFailureReason } from './resolvePostFailureReason';

describe('resolvePostFailureReason', () => {
  it('returns timeout for the composer wait', () => {
    expect(resolvePostFailureReason(new CreateSwapCommentTimeoutError())).toBe(
      'timeout',
    );
  });

  it('returns ban for a 403', () => {
    expect(resolvePostFailureReason({ httpStatus: 403 })).toBe('ban');
  });

  it('returns min_balance for the indexer minimum', () => {
    expect(
      resolvePostFailureReason(new Error('Trade is below 10 USD minimum')),
    ).toBe('min_balance');
    expect(resolvePostFailureReason({ httpStatus: 402 })).toBe('min_balance');
  });

  it('returns unknown for any other failure', () => {
    expect(resolvePostFailureReason(new Error('network down'))).toBe('unknown');
  });
});
