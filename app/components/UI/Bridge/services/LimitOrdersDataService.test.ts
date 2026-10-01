import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getLimitOrders } from '../api/limitOrders/getLimitOrders';
import {
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../api/limitOrders/getLimitOrders/mock';
import { LimitOrderStatus } from '../api/limitOrders/getLimitOrders/types';
import type { LimitOrdersQueryParams } from '../queries/limitOrders';
import {
  LimitOrdersDataService,
  type LimitOrdersDataServiceActions,
  type LimitOrdersDataServiceEvents,
  type LimitOrdersDataServiceMessenger,
} from './LimitOrdersDataService';

jest.mock('../api/limitOrders/getLimitOrders', () => ({
  getLimitOrders: jest.fn(),
}));

const mockGetLimitOrders = jest.mocked(getLimitOrders);
const PARAMS: LimitOrdersQueryParams = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  status: [LimitOrderStatus.Open],
  chainId: 'eip155:1',
  limit: 20,
};

/**
 * Builds a service messenger backed by a root messenger that answers
 * StorageService calls, mirroring what `getLimitOrdersDataServiceMessenger`
 * delegates from the real root messenger in the Engine.
 */
function createMessenger({
  setItem = jest.fn().mockResolvedValue(undefined),
  getItem = jest.fn().mockResolvedValue({}),
  removeItem = jest.fn().mockResolvedValue(undefined),
} = {}): { messenger: LimitOrdersDataServiceMessenger; setItem: jest.Mock } {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    LimitOrdersDataServiceActions,
    LimitOrdersDataServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  rootMessenger.registerActionHandler('StorageService:getItem', getItem);
  rootMessenger.registerActionHandler('StorageService:setItem', setItem);
  rootMessenger.registerActionHandler('StorageService:removeItem', removeItem);

  const messenger: LimitOrdersDataServiceMessenger = new Messenger({
    namespace: 'LimitOrdersDataService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'StorageService:getItem',
      'StorageService:setItem',
      'StorageService:removeItem',
    ],
    events: [],
    messenger,
  });

  return { messenger, setItem };
}

describe('LimitOrdersDataService', () => {
  const services: LimitOrdersDataService[] = [];

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    jest.resetAllMocks();
  });

  function buildService(messenger = createMessenger().messenger) {
    const service = new LimitOrdersDataService({ messenger });
    services.push(service);
    return service;
  }

  it('forwards query parameters to the limit-orders transport', async () => {
    mockGetLimitOrders.mockResolvedValue({ orders: [MOCK_LIMIT_OPEN_ORDER] });
    const service = buildService();

    const result = await service.getLimitOrders(PARAMS);

    expect(mockGetLimitOrders).toHaveBeenCalledWith({
      ...PARAMS,
      cursor: undefined,
    });
    expect(result.orders).toStrictEqual([MOCK_LIMIT_OPEN_ORDER]);
  });

  it('fetches the page identified by the previous response cursor', async () => {
    mockGetLimitOrders
      .mockResolvedValueOnce({
        orders: [MOCK_LIMIT_OPEN_ORDER],
        nextCursor: 'next-page',
      })
      .mockResolvedValueOnce({
        orders: [MOCK_LIMIT_FILLED_ORDER],
      });
    const service = buildService();

    const firstPage = await service.getLimitOrders(PARAMS);
    const secondPage = await service.getLimitOrders(
      PARAMS,
      firstPage.nextCursor,
    );

    expect(mockGetLimitOrders).toHaveBeenNthCalledWith(1, {
      ...PARAMS,
      cursor: undefined,
    });
    expect(mockGetLimitOrders).toHaveBeenNthCalledWith(2, {
      ...PARAMS,
      cursor: 'next-page',
    });
    expect(secondPage.orders).toStrictEqual([MOCK_LIMIT_FILLED_ORDER]);
  });

  it('persists a successful fetch to StorageService so it survives a restart', async () => {
    jest.useFakeTimers();
    try {
      mockGetLimitOrders.mockResolvedValue({
        orders: [MOCK_LIMIT_OPEN_ORDER],
      });
      const { messenger, setItem } = createMessenger();
      const service = buildService(messenger);

      await service.getLimitOrders(PARAMS);
      // Persistence is debounced; advance past the default write delay.
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();
      await Promise.resolve();

      expect(setItem).toHaveBeenCalledWith(
        'LimitOrdersDataService',
        'cache',
        expect.objectContaining({
          timestamp: expect.any(Number),
          state: expect.objectContaining({ queries: expect.any(Array) }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
