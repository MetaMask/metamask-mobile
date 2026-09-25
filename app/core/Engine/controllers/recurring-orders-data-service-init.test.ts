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
import { RecurringOrderStatus } from '../../../components/UI/Bridge/api/recurringOrders.types';
import { resetRecurringOrdersMockState } from '../../../components/UI/Bridge/api/recurringOrders';
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { recurringOrdersDataServiceInit } from './recurring-orders-data-service-init';

describe('recurringOrdersDataServiceInit', () => {
  it('registers recurring-orders actions on the Engine root messenger', async () => {
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
    );
    const result = await rootMessenger.call(
      'RecurringOrdersDataService:getRecurringOrders',
      {
        walletAddress: '0x1234',
        status: [RecurringOrderStatus.Expired],
      },
    );

    expect(result).toStrictEqual({ orders: [] });
    controller.destroy();
    resetRecurringOrdersMockState();
  });
});
