import { reportSocialServiceFailure } from '../../../../util/social/socialServiceTelemetry';
import {
  CREATE_SWAP_COMMENT_TIMEOUT_MS,
  CreateSwapCommentTimeoutError,
  withCreateSwapCommentTimeout,
} from './createSwapCommentTimeout';

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  reportSocialServiceFailure: jest.fn(),
}));

describe('withCreateSwapCommentTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(reportSocialServiceFailure).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the result when the request finishes within 7 seconds', async () => {
    const result = withCreateSwapCommentTimeout(Promise.resolve('created'));

    await expect(result).resolves.toBe('created');
    jest.advanceTimersByTime(CREATE_SWAP_COMMENT_TIMEOUT_MS);
    expect(reportSocialServiceFailure).not.toHaveBeenCalled();
  });

  it('rejects and reports to Sentry when the request is still pending at 7 seconds', async () => {
    const result = withCreateSwapCommentTimeout(new Promise(() => undefined));
    const settled = result.then(
      () => 'resolved',
      (error: unknown) => error,
    );

    jest.advanceTimersByTime(CREATE_SWAP_COMMENT_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(reportSocialServiceFailure).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await expect(settled).resolves.toBeInstanceOf(
      CreateSwapCommentTimeoutError,
    );
    expect(reportSocialServiceFailure).toHaveBeenCalledTimes(1);
    expect(reportSocialServiceFailure).toHaveBeenCalledWith(
      expect.any(CreateSwapCommentTimeoutError),
      expect.objectContaining({
        surface: 'post_composer',
        operation: 'create_comment_timeout',
        endpoint: 'create_comment',
      }),
    );
  });

  it('ignores a result that arrives after the timeout', async () => {
    let finish: (value: string) => void = () => undefined;
    const result = withCreateSwapCommentTimeout(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    const settled = result.then(
      () => 'resolved',
      (error: unknown) => error,
    );

    jest.advanceTimersByTime(CREATE_SWAP_COMMENT_TIMEOUT_MS);
    finish('late');

    await expect(settled).resolves.toBeInstanceOf(
      CreateSwapCommentTimeoutError,
    );
  });
});
