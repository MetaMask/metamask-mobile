import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  LimitOrdersDataServiceActions,
  LimitOrdersDataServiceEvents,
} from '../../../components/UI/Bridge/services/LimitOrdersDataService';
import { LimitOrderStatus } from '../../../components/UI/Bridge/api/limitOrders/getLimitOrders/types';
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getLimitOrdersDataServiceMessenger } from '../messengers/limit-orders-data-service-messenger';
import { limitOrdersDataServiceInit } from './limit-orders-data-service-init';

describe('limitOrdersDataServiceInit', () => {
  it('registers limit-orders actions and rehydrates the persisted cache on init', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      LimitOrdersDataServiceActions,
      LimitOrdersDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const getItem = jest.fn().mockResolvedValue({});
    rootMessenger.registerActionHandler('StorageService:getItem', getItem);
    rootMessenger.registerActionHandler(
      'StorageService:setItem',
      jest.fn().mockResolvedValue(undefined),
    );
    rootMessenger.registerActionHandler(
      'StorageService:removeItem',
      jest.fn().mockResolvedValue(undefined),
    );

    const controllerMessenger =
      getLimitOrdersDataServiceMessenger(rootMessenger);
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
    };

    const { controller } = limitOrdersDataServiceInit(request);
    const result = await rootMessenger.call(
      'LimitOrdersDataService:getLimitOrders',
      {
        walletAddress: '0x1234',
        status: [LimitOrderStatus.Failed],
      },
    );

    expect(result.orders).toHaveLength(1);
    // init() rehydrates fire-and-forget; flush the microtask queue.
    await Promise.resolve();
    expect(getItem).toHaveBeenCalledWith('LimitOrdersDataService', 'cache');
    controller.destroy();
  });
});
