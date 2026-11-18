import { captureException } from '@sentry/react-native';
import {
  CREATE_SWAP_COMMENT_TIMEOUT_MS,
  CreateSwapCommentTimeoutError,
  withCreateSwapCommentTimeout,
} from './createSwapCommentTimeout';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('withCreateSwapCommentTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(captureException).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the result when the request finishes within 7 seconds', async () => {
    const result = withCreateSwapCommentTimeout(Promise.resolve('created'));

    await expect(result).resolves.toBe('created');
    jest.advanceTimersByTime(CREATE_SWAP_COMMENT_TIMEOUT_MS);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('rejects and reports to Sentry when the request is still pending at 7 seconds', async () => {
    const result = withCreateSwapCommentTimeout(new Promise(() => undefined));
    const settled = result.then(
      () => 'resolved',
      (error: unknown) => error,
    );

    jest.advanceTimersByTime(CREATE_SWAP_COMMENT_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(captureException).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await expect(settled).resolves.toBeInstanceOf(
      CreateSwapCommentTimeoutError,
    );
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(CreateSwapCommentTimeoutError),
      {
        tags: {
          feature: 'social',
          context: 'createSwapComment.timeout',
        },
      },
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
