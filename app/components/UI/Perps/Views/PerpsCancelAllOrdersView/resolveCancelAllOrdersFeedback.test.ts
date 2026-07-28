import type { CancelOrdersResult } from '@metamask/perps-controller';
import {
  resolveCancelAllErrorMessage,
  resolveCancelAllSuccessFeedback,
} from './resolveCancelAllOrdersFeedback';

describe('resolveCancelAllSuccessFeedback', () => {
  it('returns none when there are zero successes', () => {
    const result = {
      success: false,
      successCount: 0,
      failureCount: 2,
    } as CancelOrdersResult;

    expect(resolveCancelAllSuccessFeedback(result)).toEqual({ action: 'none' });
  });

  it('returns success feedback and closes overlay when all cancels succeed', () => {
    const result = {
      success: true,
      successCount: 2,
      failureCount: 0,
    } as CancelOrdersResult;

    expect(resolveCancelAllSuccessFeedback(result)).toEqual({
      action: 'success',
      successCount: 2,
      shouldCloseOverlay: true,
    });
  });

  it('returns partial feedback and closes overlay when some cancels fail', () => {
    const result = {
      success: false,
      successCount: 1,
      failureCount: 1,
    } as CancelOrdersResult;

    expect(resolveCancelAllSuccessFeedback(result)).toEqual({
      action: 'partial',
      successCount: 1,
      totalCount: 2,
      shouldCloseOverlay: true,
    });
  });

  it('returns none when success is false and there are no failures', () => {
    const result = {
      success: false,
      successCount: 1,
      failureCount: 0,
    } as CancelOrdersResult;

    expect(resolveCancelAllSuccessFeedback(result)).toEqual({ action: 'none' });
  });
});

describe('resolveCancelAllErrorMessage', () => {
  it('uses the error message when present', () => {
    expect(resolveCancelAllErrorMessage(new Error('Network timeout'))).toBe(
      'Network timeout',
    );
  });

  it('falls back to Unknown error when the message is empty', () => {
    expect(resolveCancelAllErrorMessage(new Error(''))).toBe('Unknown error');
  });
});
