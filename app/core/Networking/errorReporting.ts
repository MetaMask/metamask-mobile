import { CancelledError, onlineManager } from '@tanstack/react-query';
import Logger from '../../util/Logger';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { HttpError, OfflineError } from './errors';

export interface NetworkIntent {
  /** Static feature identifier used in error reports. */
  feature: string;
  /** Static operation identifier used in error reports. */
  operation: string;
  /** HTTP statuses the feature handles itself and does not report. */
  expectedStatuses?: readonly number[];
}

/** Logs one terminal failure. The raw error is dropped: it can carry a URL or body. */
export function reportNetworkFailure(
  error: unknown,
  { feature, operation, expectedStatuses }: NetworkIntent,
  attempt: number,
): void {
  const status =
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : undefined;
  if (
    error instanceof CancelledError ||
    error instanceof OfflineError ||
    !onlineManager.isOnline() ||
    (error instanceof Error && error.name === 'AbortError') ||
    (status !== undefined && expectedStatuses?.includes(status))
  )
    return;

  const { hardware, network, latency } = getNetworkConditions();
  Logger.error(
    new Error(
      status === undefined ? 'Networking operation failed' : `HTTP ${status}`,
    ),
    {
      tags: {
        feature,
        operation,
        'http.status': status ?? 'UNKNOWN',
        'network.tier': network ?? 'UNKNOWN',
        'hardware.tier': hardware ?? 'UNKNOWN',
        'latency.bucket': latency,
      },
      context: {
        name: 'networking',
        data: {
          host: error instanceof HttpError ? error.host : undefined,
          attempt,
        },
      },
    },
  );
}
