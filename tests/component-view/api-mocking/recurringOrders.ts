import Engine from '../../../app/core/Engine';
import {
  cancelRecurringOrder,
  getRecurringOrders,
  getRecurringOrdersByAsset,
  getRecurringSwaps,
  resetRecurringOrdersMockState,
} from '../../../app/components/UI/Bridge/api/recurringOrders';
import type {
  RecurringOrdersByAssetQueryParams,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../../../app/components/UI/Bridge/queries/recurringOrders';

type MessengerCall = (action: string, ...args: unknown[]) => unknown;

const messengerCall = Engine.controllerMessenger
  .call as unknown as jest.MockedFunction<MessengerCall>;
const defaultImplementation = messengerCall.getMockImplementation();

interface RecurringOrdersDataServiceMockOptions {
  recurringOrders?: typeof getRecurringOrders;
  recurringOrdersByAsset?: typeof getRecurringOrdersByAsset;
  recurringSwaps?: typeof getRecurringSwaps;
  cancelRecurringOrder?: typeof cancelRecurringOrder;
}

export function setupRecurringOrdersDataServiceMock({
  recurringOrders = getRecurringOrders,
  recurringOrdersByAsset = getRecurringOrdersByAsset,
  recurringSwaps = getRecurringSwaps,
  cancelRecurringOrder: cancelRecurringOrderRequest = cancelRecurringOrder,
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

      if (action === 'RecurringOrdersDataService:getRecurringOrdersByAsset') {
        const [, params] = messengerArgs as [
          string,
          RecurringOrdersByAssetQueryParams,
        ];
        return recurringOrdersByAsset(params);
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

      if (action === 'RecurringOrdersDataService:cancelRecurringOrder') {
        const [, orderId] = messengerArgs as [string, string];
        return cancelRecurringOrderRequest(orderId);
      }

      return defaultImplementation?.(...messengerArgs);
    },
  );
}

export function clearRecurringOrdersDataServiceMock() {
  if (defaultImplementation) {
    messengerCall.mockImplementation(defaultImplementation);
  } else {
    messengerCall.mockReset();
  }
  resetRecurringOrdersMockState();
}
