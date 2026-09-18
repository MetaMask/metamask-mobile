import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  RecurringOrdersDataServiceActions,
  RecurringOrdersDataServiceEvents,
} from '../../../components/UI/Bridge/services/RecurringOrdersDataService';
import { getRecurringOrdersDataServiceMessenger } from './recurring-orders-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  RecurringOrdersDataServiceActions,
  RecurringOrdersDataServiceEvents
>;

describe('getRecurringOrdersDataServiceMessenger', () => {
  it('exposes registered recurring-orders actions to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger =
      getRecurringOrdersDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'RecurringOrdersDataService:getRecurringOrders',
      jest.fn().mockResolvedValue({ orders: [] }),
    );

    const result = await rootMessenger.call(
      'RecurringOrdersDataService:getRecurringOrders',
      { walletAddress: '0x1234' },
    );

    expect(result).toStrictEqual({ orders: [] });
  });

  it('exposes recurring-swaps arguments in query-key order', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger =
      getRecurringOrdersDataServiceMessenger(rootMessenger);
    const handler = jest.fn().mockResolvedValue({ swaps: [] });
    serviceMessenger.registerActionHandler(
      'RecurringOrdersDataService:getRecurringSwaps',
      handler,
    );

    const result = await rootMessenger.call(
      'RecurringOrdersDataService:getRecurringSwaps',
      'order-id',
      { limit: 20 },
      'swap-cursor',
    );

    expect(handler).toHaveBeenCalledWith(
      'order-id',
      { limit: 20 },
      'swap-cursor',
    );
    expect(result).toStrictEqual({ swaps: [] });
  });
});
