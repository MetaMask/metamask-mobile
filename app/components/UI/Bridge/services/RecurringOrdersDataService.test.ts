import { Messenger } from '@metamask/messenger';
import {
  cancelRecurringOrder,
  getRecurringOrders,
  getRecurringOrdersByAsset,
  getRecurringSwaps,
} from '../api/recurringOrders';
import {
  MOCK_RECURRING_ACCOUNT,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
} from '../api/recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from '../api/recurringSwaps.mock';
import { RecurringOrderState } from '../api/recurringOrders.types';
import type {
  RecurringOrdersByAssetQueryParams,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../queries/recurringOrders';
import {
  RecurringOrdersDataService,
  type RecurringOrdersDataServiceMessenger,
} from './RecurringOrdersDataService';

jest.mock('../api/recurringOrders', () => ({
  cancelRecurringOrder: jest.fn(),
  getRecurringOrders: jest.fn(),
  getRecurringOrdersByAsset: jest.fn(),
  getRecurringSwaps: jest.fn(),
}));

const mockCancelRecurringOrder = jest.mocked(cancelRecurringOrder);
const mockGetRecurringOrders = jest.mocked(getRecurringOrders);
const mockGetRecurringOrdersByAsset = jest.mocked(getRecurringOrdersByAsset);
const mockGetRecurringSwaps = jest.mocked(getRecurringSwaps);
const PARAMS: RecurringOrdersQueryParams = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  orderStates: [RecurringOrderState.Open],
  chainId: 'eip155:1',
  limit: 20,
};
const ASSET_PARAMS: RecurringOrdersByAssetQueryParams = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
};
const SWAPS_PARAMS: RecurringSwapsQueryParams = {
  accountAddress: MOCK_RECURRING_ACCOUNT,
  limit: 20,
};

function createService() {
  const messenger: RecurringOrdersDataServiceMessenger = new Messenger({
    namespace: 'RecurringOrdersDataService',
  });

  return new RecurringOrdersDataService({ messenger });
}

describe('RecurringOrdersDataService', () => {
  const services: RecurringOrdersDataService[] = [];

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    jest.resetAllMocks();
  });

  function buildService() {
    const service = createService();
    services.push(service);
    return service;
  }

  it('forwards query parameters to the recurring-orders transport', async () => {
    mockGetRecurringOrders.mockResolvedValue({
      orders: [MOCK_RECURRING_OPEN_ORDER],
      hasNextPage: false,
    });
    const service = buildService();

    const result = await service.getRecurringOrders(PARAMS);

    expect(mockGetRecurringOrders).toHaveBeenCalledWith({
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: PARAMS.orderStates,
      chainIds: [PARAMS.chainId],
      limit: PARAMS.limit,
    });
    expect(result.orders).toStrictEqual([MOCK_RECURRING_OPEN_ORDER]);
  });

  it('forwards asset parameters to the recurring-orders transport', async () => {
    mockGetRecurringOrdersByAsset.mockResolvedValue([
      MOCK_RECURRING_OPEN_ORDER,
    ]);
    const service = buildService();

    const result = await service.getRecurringOrdersByAsset(ASSET_PARAMS);

    expect(mockGetRecurringOrdersByAsset).toHaveBeenCalledWith(ASSET_PARAMS);
    expect(result).toStrictEqual([MOCK_RECURRING_OPEN_ORDER]);
  });

  it('forwards cancellation to the recurring-orders transport', async () => {
    mockCancelRecurringOrder.mockResolvedValue({
      order: {
        ...MOCK_RECURRING_OPEN_ORDER,
        state: RecurringOrderState.Cancelled,
        isCancellable: false,
      },
    });
    const service = buildService();

    await service.cancelRecurringOrder(
      MOCK_RECURRING_OPEN_ORDER.id,
      MOCK_RECURRING_OPEN_ORDER.accountAddress,
    );

    expect(mockCancelRecurringOrder).toHaveBeenCalledWith(
      MOCK_RECURRING_OPEN_ORDER.id,
      { accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress },
    );
  });

  it('propagates cancellation transport failures', async () => {
    mockCancelRecurringOrder.mockRejectedValue(new Error('cancel failed'));
    const service = buildService();

    await expect(
      service.cancelRecurringOrder(
        MOCK_RECURRING_OPEN_ORDER.id,
        MOCK_RECURRING_OPEN_ORDER.accountAddress,
      ),
    ).rejects.toThrow('cancel failed');
  });

  it('fetches the page identified by the previous response cursor', async () => {
    mockGetRecurringOrders
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER],
        endCursor: 'next-page',
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER_2],
        hasNextPage: false,
      });
    const service = buildService();

    const firstPage = await service.getRecurringOrders(PARAMS);
    const secondPage = await service.getRecurringOrders(
      PARAMS,
      firstPage.endCursor,
    );

    expect(mockGetRecurringOrders).toHaveBeenNthCalledWith(1, {
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: PARAMS.orderStates,
      chainIds: [PARAMS.chainId],
      limit: PARAMS.limit,
    });
    expect(mockGetRecurringOrders).toHaveBeenNthCalledWith(2, {
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: PARAMS.orderStates,
      chainIds: [PARAMS.chainId],
      limit: PARAMS.limit,
      after: 'next-page',
    });
    expect(secondPage.orders).toStrictEqual([MOCK_RECURRING_OPEN_ORDER_2]);
  });

  it('forwards order, query, and cursor parameters to the recurring-swaps transport', async () => {
    const orderId = MOCK_RECURRING_OPEN_ORDER.id;
    mockGetRecurringSwaps.mockResolvedValue({
      swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[0]],
      hasNextPage: false,
    });
    const service = buildService();

    const result = await service.getRecurringSwaps(
      orderId,
      SWAPS_PARAMS,
      'swap-cursor',
    );

    expect(mockGetRecurringSwaps).toHaveBeenCalledWith(orderId, {
      accountAddress: SWAPS_PARAMS.accountAddress,
      limit: SWAPS_PARAMS.limit,
      after: 'swap-cursor',
    });
    expect(result.swaps).toStrictEqual([MOCK_RECURRING_OPEN_ORDER_SWAPS[0]]);
  });

  it('fetches the recurring-swaps page identified by the previous cursor', async () => {
    const orderId = MOCK_RECURRING_OPEN_ORDER.id;
    mockGetRecurringSwaps
      .mockResolvedValueOnce({
        swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[0]],
        endCursor: 'next-swap-page',
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[1]],
        hasNextPage: false,
      });
    const service = buildService();

    const firstPage = await service.getRecurringSwaps(orderId, SWAPS_PARAMS);
    const secondPage = await service.getRecurringSwaps(
      orderId,
      SWAPS_PARAMS,
      firstPage.endCursor,
    );

    expect(mockGetRecurringSwaps).toHaveBeenNthCalledWith(1, orderId, {
      accountAddress: SWAPS_PARAMS.accountAddress,
      limit: SWAPS_PARAMS.limit,
    });
    expect(mockGetRecurringSwaps).toHaveBeenNthCalledWith(2, orderId, {
      accountAddress: SWAPS_PARAMS.accountAddress,
      limit: SWAPS_PARAMS.limit,
      after: 'next-swap-page',
    });
    expect(secondPage.swaps).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_SWAPS[1],
    ]);
  });
});
