import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  LimitOrdersDataServiceActions,
  LimitOrdersDataServiceEvents,
} from '../../../components/UI/Bridge/services/LimitOrdersDataService';
import { getLimitOrders } from '../../../components/UI/Bridge/api/limitOrders/getLimitOrders';
import { MOCK_LIMIT_FAILED_ORDER } from '../../../components/UI/Bridge/api/limitOrders/getLimitOrders/mock';
import { LimitOrderState } from '../../../components/UI/Bridge/api/limitOrders/getLimitOrders/types';
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getLimitOrdersDataServiceMessenger } from '../messengers/limit-orders-data-service-messenger';
import { limitOrdersDataServiceInit } from './limit-orders-data-service-init';

jest.mock(
  '../../../components/UI/Bridge/api/limitOrders/getLimitOrders',
  () => ({ getLimitOrders: jest.fn() }),
);

describe('limitOrdersDataServiceInit', () => {
  it('registers limit-orders actions and rehydrates the persisted cache on init', async () => {
    jest
      .mocked(getLimitOrders)
      .mockResolvedValue({ orders: [MOCK_LIMIT_FAILED_ORDER] });
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
        states: [LimitOrderState.Failed],
      },
    );

    expect(result.orders).toStrictEqual([MOCK_LIMIT_FAILED_ORDER]);
    // init() rehydrates fire-and-forget; flush the microtask queue.
    await Promise.resolve();
    expect(getItem).toHaveBeenCalledWith('LimitOrdersDataService', 'cache');
    controller.destroy();
  });
});
