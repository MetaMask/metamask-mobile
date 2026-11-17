import { CreateSwapCommentTimeoutError } from './createSwapCommentTimeout';
import { resolvePostFailureReason } from './resolvePostFailureReason';

describe('resolvePostFailureReason', () => {
  it.each([
    [new CreateSwapCommentTimeoutError(), 'timeout'],
    [{ httpStatus: 403 }, 'ban'],
    [new Error('Trade is below 10 USD minimum'), 'min_balance'],
    [{ httpStatus: 402 }, 'min_balance'],
    [new Error('network down'), 'unknown'],
  ])('maps %p', (error, reason) => {
    expect(resolvePostFailureReason(error)).toBe(reason);
  });
});
