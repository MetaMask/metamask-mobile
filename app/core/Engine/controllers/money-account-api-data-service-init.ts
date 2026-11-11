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
import { ApiEnv, getApiEnv } from '../../apiEnv';

/**
 * Money API cluster for this build. Matches the bearer token from
 * `AuthenticationController`, which also reads `getApiEnv()`.
 */
const MONEY_ACCOUNT_ENV_BY_API_ENV: Record<ApiEnv, Env> = {
  [ApiEnv.Dev]: Env.DEV,
  [ApiEnv.Uat]: Env.UAT,
  [ApiEnv.Prod]: Env.PRD,
};

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
 * `MoneyAccountBalanceService:fetchBalanceWithFallback`. The host follows
 * `MM_API_ENV` so the request uses the same cluster as the bearer token.
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
    env: MONEY_ACCOUNT_ENV_BY_API_ENV[getApiEnv()],
    trace: sentryTrace,
  });

  return { controller };
};
