import { AppState } from 'react-native';
import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
  MoneyAccountBalanceServiceTraceCallback,
  MoneyAccountBalanceServiceTraceRequest,
} from '@metamask/money-account-balance-service';
import type { TraceContext } from '@metamask/controller-utils';
import { trace, TraceOperation, TraceRequest } from '../../../util/trace';

const traceMoneyAccountDataFetch: MoneyAccountBalanceServiceTraceCallback =
  async <ReturnType>(
    request: MoneyAccountBalanceServiceTraceRequest,
    fn?: (context?: TraceContext) => ReturnType,
  ): Promise<ReturnType> => {
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
    if (!fn) {
      trace(taggedRequest);
      return undefined as ReturnType;
    }
    return await Promise.resolve(trace(taggedRequest, fn));
  };

/**
 * Initialize the money account balance service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const moneyAccountBalanceServiceInit: MessengerClientInitFunction<
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountBalanceService({
    messenger: controllerMessenger,
    trace: traceMoneyAccountDataFetch,
  });

  controller.init();

  return { controller };
};
