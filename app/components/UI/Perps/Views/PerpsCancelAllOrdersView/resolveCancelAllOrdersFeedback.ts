import {
  getBatchOperationStatus,
  type CancelOrdersResult,
  type WithBatchOperationStatus,
} from '@metamask/perps-controller';

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
    }
  | { action: 'none' };

/**
 * Maps a cancel-all Engine result to the toast / overlay side effects the
 * CancelAll sheet should apply. Pure so unit tests own the toast matrix;
 * component-view tests own the interactive sheet flows.
 */
export function resolveCancelAllSuccessFeedback(
  result: CancelOrdersResult | WithBatchOperationStatus<CancelOrdersResult>,
): CancelAllSuccessFeedback {
  const status =
    'status' in result ? result.status : getBatchOperationStatus(result);
  if (status === 'none') {
    return { action: 'none' };
  }

  if (status === 'all') {
    return {
      action: 'success',
      successCount: result.successCount,
      shouldCloseOverlay: true,
    };
  }

  return {
    action: 'partial',
    successCount: result.successCount,
    totalCount: result.successCount + result.failureCount,
  };
}

export function resolveCancelAllErrorMessage(error: Error): string {
  return error.message || 'Unknown error';
}
