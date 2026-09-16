import Engine from '../../../app/core/Engine';
import { getRecurringOrders } from '../../../app/components/UI/Bridge/api/recurringOrders';
import type { RecurringOrdersQueryParams } from '../../../app/components/UI/Bridge/queries/recurringOrders';

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const defaultImplementation = messengerCall.getMockImplementation();

export function setupRecurringOrdersDataServiceMock() {
  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action, params, cursor] = messengerArgs as [
        string,
        RecurringOrdersQueryParams,
        string | undefined,
      ];

      if (action === 'RecurringOrdersDataService:getRecurringOrders') {
        return getRecurringOrders({ ...params, cursor });
      }

      return defaultImplementation?.(...messengerArgs);
    },
  );
}

export function clearRecurringOrdersDataServiceMock() {
  messengerCall.mockImplementation(defaultImplementation);
}
