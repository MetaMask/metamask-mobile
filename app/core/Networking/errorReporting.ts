import { isCancelledError } from '@tanstack/react-query';
import Logger from '../../util/Logger';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { HttpError, OfflineError } from './errors';

/** Logs one terminal failure without retaining arbitrary errors or query data. */
export function reportNetworkFailure(
  error: unknown,
  meta: Record<string, unknown> | undefined,
  attempt: number,
): void {
  if (
    meta?.networking !== true ||
    typeof meta.feature !== 'string' ||
    isCancelledError(error) ||
    error instanceof OfflineError ||
    (error instanceof Error && error.name === 'AbortError')
  )
    return;

  const status =
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : undefined;
  if (
    status !== undefined &&
    Array.isArray(meta.expectedStatuses) &&
    meta.expectedStatuses.includes(status)
  )
    return;

  const { hardware, network, latency } = getNetworkConditions();
  const safeError = new Error(
    status === undefined ? 'Networking operation failed' : `HTTP ${status}`,
  );
  Logger.error(safeError, {
    tags: {
      feature: meta.feature,
      operation:
        typeof meta.operation === 'string' ? meta.operation : 'unknown',
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
  });
}
