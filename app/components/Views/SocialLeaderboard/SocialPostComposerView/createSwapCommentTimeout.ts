import { captureException } from '@sentry/react-native';

/** How long the composer waits for a post to be created before giving up. */
export const CREATE_SWAP_COMMENT_TIMEOUT_MS = 7000;

export class CreateSwapCommentTimeoutError extends Error {
  constructor() {
    super('Creating a post timed out after 7 seconds');
    this.name = 'CreateSwapCommentTimeoutError';
  }
}

/**
 * Rejects when `promise` is still pending after 7 seconds and reports that
 * wait to Sentry. A result that arrives later is ignored.
 */
export const withCreateSwapCommentTimeout = <T>(
  promise: Promise<T>,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new CreateSwapCommentTimeoutError();
      captureException(error, {
        tags: {
          feature: 'social',
          context: 'createSwapComment.timeout',
        },
      });
      reject(error);
    }, CREATE_SWAP_COMMENT_TIMEOUT_MS);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
