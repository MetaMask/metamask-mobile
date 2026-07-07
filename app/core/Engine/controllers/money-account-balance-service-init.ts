import { AppState } from 'react-native';
import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';
import { trace, TraceOperation } from '../../../util/trace';

// TODO: Clean up typing in file after testing
const traceMoneyAccountDataFetch = (
  request: Record<string, unknown>,
  fn?: (...args: unknown[]) => unknown,
) => {
  const taggedRequest = {
    ...request,
    op: TraceOperation.MoneyAccountDataFetch,
    data: {
      ...(request.data as Record<string, unknown> | undefined),
      app_state: AppState.currentState ?? 'unknown',
    },
  };

  // Remove disabled rule after testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (trace as any)(taggedRequest, fn);
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
    // Remove disabled rule after testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace: traceMoneyAccountDataFetch as any,
  });

  controller.init();

  return { controller };
};
