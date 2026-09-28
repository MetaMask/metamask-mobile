import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createUIQueryClient } from '@metamask/react-data-query';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import { getLimitOrdersDataServiceMessenger } from '../../../../../../core/Engine/messengers/limit-orders-data-service-messenger';
import { useLimitOrders } from '../../../hooks/useLimitOrders';
import { limitOrdersQueries } from '../../../queries/limitOrders';
import {
  LIMIT_ORDERS_DATA_SERVICE_NAME,
  LimitOrdersDataService,
  type LimitOrdersDataServiceActions,
  type LimitOrdersDataServiceEvents,
} from '../../../services/LimitOrdersDataService';
import { getLimitOrders } from '.';
import { LimitOrderState } from './types';

const mockGetBearerToken = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const WALLET_ADDRESS = '0x4751fd55e5b9723f427cf1a298f785ec2adcf123';
const OPEN_STATES = [LimitOrderState.Open];

const API_ETH = {
  chainId: 1,
  assetId: 'eip155:1/slip44:60',
  name: 'Ethereum',
  symbol: 'ETH',
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
  coingeckoId: 'ethereum',
  aggregators: [],
  occurrences: 100,
  fee: 0,
  metadata: {},
  price: '2150.12',
};

// Token enrichment is best-effort on the API side, so an asset can come back
// without its display name or icon.
const API_USDC = {
  chainId: 1,
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
};

function createApiOrder(id: string) {
  return {
    id,
    clientOrderId: `client-${id}`,
    profileId: 'f2a1c0de-0000-4000-8000-000000000001',
    account: `eip155:1:${WALLET_ADDRESS}`,
    src: { asset: API_ETH, amount: '100000000000000000', usd: '215.01' },
    dest: {
      asset: API_USDC,
      amount: '215600000',
      usd: '215.60',
      minAmount: '215600000',
    },
    trigger: { kind: 'src_price', threshold: 'above', price: '2200' },
    state: 'OPEN',
    timingData: {
      createdAt: '2026-09-20T12:00:00.000Z',
      expiresAt: '2026-09-27T12:00:00.000Z',
    },
    isCancellable: true,
  };
}

function createPageResponse(
  body: { orders: unknown[]; endCursor?: string; hasNextPage: boolean },
  { ok = true, status = 200 } = {},
) {
  return { ok, status, json: async () => body } as Response;
}

describe('getLimitOrders', () => {
  let globalFetchSpy: jest.SpyInstance;

  function getRequestedUrl(callIndex = 0): URL {
    return new URL(globalFetchSpy.mock.calls[callIndex][0]);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      createPageResponse({
        orders: [createApiOrder('order-1')],
        hasNextPage: false,
      }),
    );
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  it('requests one page of the wallet orders in the given states', async () => {
    await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
      chainId: 'eip155:56',
      limit: 20,
    });

    const url = getRequestedUrl();
    expect(`${url.origin}${url.pathname}`).toBe(
      `${BRIDGE_API_BASE_URL}/v2/orders/limit`,
    );
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      accountAddress: `eip155:1:${WALLET_ADDRESS}`,
      states: 'OPEN',
      chainIds: 'eip155:56',
      limit: '20',
    });
    expect(globalFetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: 'Bearer mock-bearer-token',
      }),
    });
  });

  it('requests every chain when no chain is given', async () => {
    await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    expect(getRequestedUrl().searchParams.has('chainIds')).toBe(false);
  });

  it('sends several states as one comma-separated list', async () => {
    await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: [
        LimitOrderState.Submitted,
        LimitOrderState.Filled,
        LimitOrderState.Cancelled,
        LimitOrderState.Expired,
        LimitOrderState.Failed,
      ],
    });

    expect(getRequestedUrl().searchParams.get('states')).toBe(
      'SUBMITTED,FILLED,CANCELLED,EXPIRED,FAILED',
    );
  });

  it('requests every state when no state is given', async () => {
    await getLimitOrders({ walletAddress: WALLET_ADDRESS });

    expect(getRequestedUrl().searchParams.has('states')).toBe(false);
  });

  it('requests the page after the given cursor', async () => {
    await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
      cursor: '42',
    });

    expect(getRequestedUrl().searchParams.get('after')).toBe('42');
  });

  it('returns the listed orders as the API sent them', async () => {
    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    // USDC comes back without a name or icon, which still validates.
    expect(result.orders).toStrictEqual([createApiOrder('order-1')]);
  });

  it('returns the end cursor while another page exists', async () => {
    globalFetchSpy.mockResolvedValue(
      createPageResponse({
        orders: [createApiOrder('order-1')],
        endCursor: '42',
        hasNextPage: true,
      }),
    );

    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    expect(result.nextCursor).toBe('42');
  });

  it('omits the cursor on the last page', async () => {
    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    expect(result).not.toHaveProperty('nextCursor');
  });

  it('throws when the response is not ok', async () => {
    globalFetchSpy.mockResolvedValue(
      createPageResponse(
        { orders: [], hasNextPage: false },
        { ok: false, status: 401 },
      ),
    );

    await expect(
      getLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    ).rejects.toThrow(/status 401/u);
  });

  it('throws a descriptive error when an order has no deadline', async () => {
    const order = createApiOrder('order-1');
    globalFetchSpy.mockResolvedValue(
      createPageResponse({
        orders: [
          { ...order, timingData: { createdAt: order.timingData.createdAt } },
        ],
        hasNextPage: false,
      }),
    );

    await expect(
      getLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    ).rejects.toThrow(/Invalid limit orders response/u);
  });

  // Drives the orders through every layer the orders tabs use: the hook, the UI
  // query client, the messenger and LimitOrdersDataService.
  describe('through useLimitOrders', () => {
    function setUp() {
      const rootMessenger = new Messenger<
        MockAnyNamespace,
        LimitOrdersDataServiceActions,
        LimitOrdersDataServiceEvents
      >({ namespace: MOCK_ANY_NAMESPACE });
      rootMessenger.registerActionHandler(
        'StorageService:getItem',
        jest.fn().mockResolvedValue({}),
      );
      rootMessenger.registerActionHandler(
        'StorageService:setItem',
        jest.fn().mockResolvedValue(undefined),
      );
      rootMessenger.registerActionHandler(
        'StorageService:removeItem',
        jest.fn().mockResolvedValue(undefined),
      );

      const service = new LimitOrdersDataService({
        messenger: getLimitOrdersDataServiceMessenger(rootMessenger),
      });
      const queryClient = createUIQueryClient(
        [LIMIT_ORDERS_DATA_SERVICE_NAME] as const,
        {
          call: rootMessenger.call.bind(rootMessenger) as (
            action: string,
            ...params: unknown[]
          ) => unknown,
          subscribe: (eventType, handler) =>
            rootMessenger.subscribe(eventType, handler),
          unsubscribe: (eventType, handler) =>
            rootMessenger.unsubscribe(eventType, handler),
        },
      );
      const wrapper = ({ children }: PropsWithChildren) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children,
        );

      const hook = renderHook(
        () =>
          useLimitOrders({
            walletAddress: WALLET_ADDRESS,
            states: OPEN_STATES,
          }),
        { wrapper },
      );

      return {
        ...hook,
        queryClient,
        tearDown: () => {
          hook.unmount();
          queryClient.clear();
          service.destroy();
        },
      };
    }

    it('loads the next page with the cursor of the previous one', async () => {
      globalFetchSpy
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-1')],
            endCursor: '42',
            hasNextPage: true,
          }),
        )
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-2')],
            hasNextPage: false,
          }),
        );
      const { result, tearDown } = setUp();

      try {
        await waitFor(() => expect(result.current.orders).toHaveLength(1));
        expect(result.current.hasNextPage).toBe(true);

        act(() => result.current.fetchNextPage());

        await waitFor(() => expect(result.current.hasNextPage).toBe(false));
        expect(result.current.orders.map(({ id }) => id)).toStrictEqual([
          'order-1',
          'order-2',
        ]);
        expect(globalFetchSpy).toHaveBeenCalledTimes(2);
        expect(getRequestedUrl(0).searchParams.has('after')).toBe(false);
        expect(getRequestedUrl(1).searchParams.get('after')).toBe('42');
      } finally {
        tearDown();
      }
    });

    it('reloads the orders from the API on refresh', async () => {
      globalFetchSpy
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-1')],
            hasNextPage: false,
          }),
        )
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-2'), createApiOrder('order-1')],
            hasNextPage: false,
          }),
        );
      const { result, tearDown } = setUp();

      try {
        await waitFor(() => expect(result.current.orders).toHaveLength(1));

        await act(async () => {
          await result.current.refresh();
        });

        // Resolves only once the API has answered, which is what keeps the pull
        // to refresh spinner up for the whole reload.
        expect(globalFetchSpy).toHaveBeenCalledTimes(2);
        await waitFor(() =>
          expect(result.current.orders.map(({ id }) => id)).toStrictEqual([
            'order-2',
            'order-1',
          ]),
        );
      } finally {
        tearDown();
      }
    });

    it('refetches the open orders from the API once they are invalidated', async () => {
      globalFetchSpy
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-1')],
            hasNextPage: false,
          }),
        )
        .mockResolvedValueOnce(
          createPageResponse({
            orders: [createApiOrder('order-2'), createApiOrder('order-1')],
            hasNextPage: false,
          }),
        );
      const { result, queryClient, tearDown } = setUp();

      try {
        await waitFor(() => expect(result.current.orders).toHaveLength(1));

        // Left alone, a refetch is answered from the data service cache.
        await act(async () => {
          await result.current.refetch();
        });
        expect(globalFetchSpy).toHaveBeenCalledTimes(1);

        await act(async () => {
          await queryClient.invalidateQueries({
            queryKey: limitOrdersQueries.openOrdersKey(),
          });
        });

        await waitFor(() =>
          expect(result.current.orders.map(({ id }) => id)).toStrictEqual([
            'order-2',
            'order-1',
          ]),
        );
        expect(globalFetchSpy).toHaveBeenCalledTimes(2);
      } finally {
        tearDown();
      }
    });
  });
});
