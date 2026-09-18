import Engine from '../../../app/core/Engine';
import {
  getRecurringOrders,
  getRecurringSwaps,
} from '../../../app/components/UI/Bridge/api/recurringOrders';
import type {
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../../../app/components/UI/Bridge/queries/recurringOrders';

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const defaultImplementation = messengerCall.getMockImplementation();

interface RecurringOrdersDataServiceMockOptions {
  recurringOrders?: typeof getRecurringOrders;
  recurringSwaps?: typeof getRecurringSwaps;
}

export function setupRecurringOrdersDataServiceMock({
  recurringOrders = getRecurringOrders,
  recurringSwaps = getRecurringSwaps,
}: RecurringOrdersDataServiceMockOptions = {}) {
  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action] = messengerArgs;

      if (action === 'RecurringOrdersDataService:getRecurringOrders') {
        const [, params, cursor] = messengerArgs as [
          string,
          RecurringOrdersQueryParams,
          string | undefined,
        ];
        return recurringOrders({ ...params, cursor });
      }

      if (action === 'RecurringOrdersDataService:getRecurringSwaps') {
        const [, orderId, params, cursor] = messengerArgs as [
          string,
          string,
          RecurringSwapsQueryParams,
          string | undefined,
        ];
        return recurringSwaps(orderId, { ...params, cursor });
      }

      return defaultImplementation?.(...messengerArgs);
    },
  );
}

export function clearRecurringOrdersDataServiceMock() {
  messengerCall.mockImplementation(defaultImplementation);
}
