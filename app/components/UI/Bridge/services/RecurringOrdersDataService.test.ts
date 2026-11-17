import { Messenger } from '@metamask/messenger';
import { recurringOrdersApiClient } from '../api/recurringOrders.client';
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

jest.mock('../api/recurringOrders.client', () => ({
  recurringOrdersApiClient: {
    getRecurringOrders: jest.fn(),
    getRecurringSwaps: jest.fn(),
  },
}));

const mockGetRecurringOrders = jest.mocked(
  recurringOrdersApiClient.getRecurringOrders,
);
const mockGetRecurringSwaps = jest.mocked(
  recurringOrdersApiClient.getRecurringSwaps,
);
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
      total: 1,
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

  it('forwards the documented cancelled order filter', async () => {
    mockGetRecurringOrders.mockResolvedValue({
      orders: [],
      hasNextPage: false,
      total: 0,
    });
    const service = buildService();

    await service.getRecurringOrders({
      ...PARAMS,
      orderStates: [RecurringOrderState.Cancelled],
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
    });

    expect(mockGetRecurringOrders).toHaveBeenCalledWith({
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: [RecurringOrderState.Cancelled],
      chainIds: [PARAMS.chainId],
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
      limit: PARAMS.limit,
    });
  });

  it('forwards asset parameters to the recurring-orders transport', async () => {
    mockGetRecurringOrders.mockResolvedValue({
      orders: [MOCK_RECURRING_OPEN_ORDER],
      hasNextPage: false,
      total: 1,
    });
    const service = buildService();

    const result = await service.getRecurringOrdersByAsset(ASSET_PARAMS);

    expect(mockGetRecurringOrders).toHaveBeenCalledWith({
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: [RecurringOrderState.Open],
      assetId: ASSET_PARAMS.assetId,
      limit: 1,
    });
    expect(result).toStrictEqual([MOCK_RECURRING_OPEN_ORDER]);
  });

  it('fetches the page identified by the previous response cursor', async () => {
    mockGetRecurringOrders
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER],
        endCursor: 'next-page',
        hasNextPage: true,
        total: 2,
      })
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER_2],
        hasNextPage: false,
        total: 2,
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
      total: 1,
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
        total: 2,
      })
      .mockResolvedValueOnce({
        swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[1]],
        hasNextPage: false,
        total: 2,
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
