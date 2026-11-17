import { extractHttpStatus } from '../../../../util/social/socialServiceTelemetry';
import type { SocialPostFailureReason } from '../analytics/socialEvents';
import { CreateSwapCommentTimeoutError } from './createSwapCommentTimeout';

const MIN_BALANCE_MESSAGE =
  /minimum|min(?:imum)? balance|\$10|at least 10|below 10/i;

/**
 * Maps a failed `createSwapComment` to the failure reason on `post_failed`.
 * A 403 is the ban the composer already treats as a moderation block.
 */
export const resolvePostFailureReason = (
  error: unknown,
): SocialPostFailureReason => {
  if (error instanceof CreateSwapCommentTimeoutError) {
    return 'timeout';
  }
  const status = extractHttpStatus(error);
  if (status === 403) {
    return 'ban';
  }
  const message = error instanceof Error ? error.message : '';
  if (status === 402 || MIN_BALANCE_MESSAGE.test(message)) {
    return 'min_balance';
  }
  return 'unknown';
};
