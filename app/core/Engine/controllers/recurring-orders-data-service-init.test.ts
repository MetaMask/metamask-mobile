import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  RecurringOrdersDataServiceActions,
  RecurringOrdersDataServiceEvents,
  RecurringOrdersDataServiceMessenger,
} from '../../../components/UI/Bridge/services/RecurringOrdersDataService';
import { RecurringOrderState } from '../../../components/UI/Bridge/api/recurringOrders.types';
import {
  cancelRecurringOrder,
  getRecurringOrders,
  getRecurringOrdersByAsset,
} from '../../../components/UI/Bridge/api/recurringOrders';
import { MOCK_RECURRING_OPEN_ORDER } from '../../../components/UI/Bridge/api/recurringOrders.mock';
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { recurringOrdersDataServiceInit } from './recurring-orders-data-service-init';

jest.mock('../../../components/UI/Bridge/api/recurringOrders', () => ({
  cancelRecurringOrder: jest.fn(),
  getRecurringOrders: jest.fn(),
  getRecurringOrdersByAsset: jest.fn(),
  getRecurringSwaps: jest.fn(),
}));

describe('recurringOrdersDataServiceInit', () => {
  it('registers recurring-orders actions on the Engine root messenger', async () => {
    jest.mocked(cancelRecurringOrder).mockResolvedValue({
      order: {
        ...MOCK_RECURRING_OPEN_ORDER,
        state: RecurringOrderState.Cancelled,
      },
    });
    jest.mocked(getRecurringOrders).mockResolvedValue({ orders: [] });
    jest
      .mocked(getRecurringOrdersByAsset)
      .mockResolvedValue([MOCK_RECURRING_OPEN_ORDER]);
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      RecurringOrdersDataServiceActions,
      RecurringOrdersDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: RecurringOrdersDataServiceMessenger =
      new Messenger({
        namespace: 'RecurringOrdersDataService',
        parent: rootMessenger,
      });
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
    };

    const { controller } = recurringOrdersDataServiceInit(request);
    await rootMessenger.call(
      'RecurringOrdersDataService:cancelRecurringOrder',
      'mock-recurring-order-open',
      MOCK_RECURRING_OPEN_ORDER.account,
    );
    const result = await rootMessenger.call(
      'RecurringOrdersDataService:getRecurringOrders',
      {
        walletAddress: '0x1234',
        orderStates: [RecurringOrderState.Expired],
      },
    );
    const assetResult = await rootMessenger.call(
      'RecurringOrdersDataService:getRecurringOrdersByAsset',
      {
        walletAddress: '0x1234',
        assetId: 'eip155:1/slip44:60',
      },
    );

    expect(result).toStrictEqual({ orders: [] });
    expect(assetResult).toHaveLength(1);
    controller.destroy();
  });
});
