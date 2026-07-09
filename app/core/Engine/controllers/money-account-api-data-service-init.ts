import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountApiDataService,
  type MoneyAccountApiDataServiceMessenger,
  type MoneyAccountApiDataServiceTraceCallback,
  type MoneyAccountApiDataServiceTraceRequest,
} from '@metamask/money-account-api-data-service';
import {
  trace,
  type TraceCallback,
  type TraceName,
} from '../../../util/trace';

/**
 * Adapter that bridges the service's trace interface to the mobile Sentry
 * trace utility.  The service emits a backdated, fire-and-forget trace in
 * each method's `finally` block with `startTime`, `success`, `errorName`,
 * and `operation` attributes — the adapter simply forwards these into
 * Sentry's `startSpan` via the shared `trace()` helper.
 */
const sentryTrace: MoneyAccountApiDataServiceTraceCallback = async <T>(
  request: MoneyAccountApiDataServiceTraceRequest,
  fn?: (context?: unknown) => T,
): Promise<T> =>
  trace(
    {
      name: request.name as unknown as TraceName,
      startTime: request.startTime,
      data: request.data as Record<string, number | string | boolean>,
      id: request.id,
    },
    fn as TraceCallback<T>,
  );

/**
 * Initialize the money account API data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const moneyAccountApiDataServiceInit: MessengerClientInitFunction<
  MoneyAccountApiDataService,
  MoneyAccountApiDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountApiDataService({
    messenger: controllerMessenger,
    trace: sentryTrace,
  });

  return { controller };
};
