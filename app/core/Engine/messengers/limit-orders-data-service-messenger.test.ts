import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  LimitOrdersDataServiceActions,
  LimitOrdersDataServiceEvents,
} from '../../../components/UI/Bridge/services/LimitOrdersDataService';
import { getLimitOrdersDataServiceMessenger } from './limit-orders-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  LimitOrdersDataServiceActions,
  LimitOrdersDataServiceEvents
>;

describe('getLimitOrdersDataServiceMessenger', () => {
  it('exposes registered limit-orders actions to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger = getLimitOrdersDataServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'LimitOrdersDataService:getLimitOrders',
      jest.fn().mockResolvedValue({ orders: [] }),
    );

    const result = await rootMessenger.call(
      'LimitOrdersDataService:getLimitOrders',
      { walletAddress: '0x1234' },
    );

    expect(result).toStrictEqual({ orders: [] });
  });

  it('delegates the StorageService actions needed to persist and rehydrate the cache', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const getItem = jest.fn().mockResolvedValue({});
    const setItem = jest.fn().mockResolvedValue(undefined);
    const removeItem = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler('StorageService:getItem', getItem);
    rootMessenger.registerActionHandler('StorageService:setItem', setItem);
    rootMessenger.registerActionHandler(
      'StorageService:removeItem',
      removeItem,
    );

    const serviceMessenger = getLimitOrdersDataServiceMessenger(rootMessenger);
    await serviceMessenger.call(
      'StorageService:setItem',
      'LimitOrdersDataService',
      'cache',
      { timestamp: 0, state: { queries: [], mutations: [] } },
    );
    await serviceMessenger.call(
      'StorageService:getItem',
      'LimitOrdersDataService',
      'cache',
    );
    await serviceMessenger.call(
      'StorageService:removeItem',
      'LimitOrdersDataService',
      'cache',
    );

    expect(setItem).toHaveBeenCalledWith('LimitOrdersDataService', 'cache', {
      timestamp: 0,
      state: { queries: [], mutations: [] },
    });
    expect(getItem).toHaveBeenCalledWith('LimitOrdersDataService', 'cache');
    expect(removeItem).toHaveBeenCalledWith('LimitOrdersDataService', 'cache');
  });
});
