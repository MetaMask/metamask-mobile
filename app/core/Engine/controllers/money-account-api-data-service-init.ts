import { AppState } from 'react-native';
import {
  Env,
  MoneyAccountApiDataService,
  type MoneyAccountApiDataServiceMessenger,
  type MoneyAccountApiDataServiceTraceRequest,
  type MoneyAccountApiDataServiceTraceCallback,
} from '@metamask/money-account-api-data-service';
import type { TraceContext } from '@metamask/controller-utils';
import { MessengerClientInitFunction } from '../types';
import { trace, TraceOperation, type TraceRequest } from '../../../util/trace';

/**
 * Adapter that bridges the service's trace interface to the mobile Sentry
 * trace utility.  The service emits a backdated, fire-and-forget trace in
 * each method's `finally` block with `startTime`, `success`, `errorName`,
 * and `operation` attributes — the adapter simply forwards these into
 * Sentry's `startSpan` via the shared `trace()` helper.
 */
const sentryTrace: MoneyAccountApiDataServiceTraceCallback = async <T>(
  request: MoneyAccountApiDataServiceTraceRequest,
  fn: (context?: TraceContext) => T = () => undefined as T,
): Promise<T> => {
  const taggedRequest: TraceRequest = {
    id: request.id,
    name: request.name as TraceRequest['name'],
    startTime: request.startTime,
    op: TraceOperation.MoneyAccountDataFetch,
    tags: request.tags,
    data: {
      ...request.data,
      app_state: AppState.currentState ?? 'unknown',
    },
  };
  return await Promise.resolve(trace(taggedRequest, fn));
};

/**
 * Initialize the money account API data service.
 *
 * Used as the Money API source behind
 * `MoneyAccountBalanceService:fetchBalanceWithFallback`.
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
    env: Env.PRD,
    trace: sentryTrace,
  });

  return { controller };
};
