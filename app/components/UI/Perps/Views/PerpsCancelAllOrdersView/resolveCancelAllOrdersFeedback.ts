import type { CancelOrdersResult } from '@metamask/perps-controller';

export type CancelAllSuccessFeedback =
  | {
      action: 'success';
      successCount: number;
      shouldCloseOverlay: true;
    }
  | {
      action: 'partial';
      successCount: number;
      totalCount: number;
      shouldCloseOverlay: true;
    }
  | { action: 'none' };

/**
 * Maps a cancel-all Engine result to the toast / overlay side effects the
 * CancelAll sheet should apply. Pure so unit tests own the toast matrix;
 * component-view tests own the interactive sheet flows.
 */
export function resolveCancelAllSuccessFeedback(
  result: CancelOrdersResult,
): CancelAllSuccessFeedback {
  if (result.successCount <= 0) {
    return { action: 'none' };
  }

  if (result.success) {
    return {
      action: 'success',
      successCount: result.successCount,
      shouldCloseOverlay: true,
    };
  }

  if (result.failureCount > 0) {
    return {
      action: 'partial',
      successCount: result.successCount,
      totalCount: result.successCount + result.failureCount,
      shouldCloseOverlay: true,
    };
  }

  return { action: 'none' };
}

export function resolveCancelAllErrorMessage(error: Error): string {
  return error.message || 'Unknown error';
}
