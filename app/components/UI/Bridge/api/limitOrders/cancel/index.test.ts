import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Logger from '../../../../../../util/Logger';
import { limitOrdersQueries } from '../../../queries/limitOrders';
import { LimitOrderState } from '../getLimitOrders/types';
import {
  cancelLimitOrder,
  useCancelLimitOrder,
  type CancelLimitOrderParams,
} from '.';
import { LimitOrderNotOpenError } from './errors';
import { CancelLimitOrderOutcome } from './constants';

const mockGetBearerToken = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const ORDER_ID = '2421deda-7395-4ec9-82b8-3384aa7320e4';
const ACCOUNT_ADDRESS = 'eip155:143:0x4751fd55e5b9723f427cf1a298f785ec2adcf123';

const CANCEL_PARAMS: CancelLimitOrderParams = {
  orderId: ORDER_ID,
  accountAddress: ACCOUNT_ADDRESS,
};

const ASSET = {
  chainId: 143,
  assetId: 'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603',
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
  decimals: 6,
  iconUrl: 'https://static.cx.metamask.io/api/v1/tokenIcons/143/0x7547.png',
  coingeckoId: 'usd-coin',
  aggregators: ['lifi'],
  occurrences: 3,
  fee: 0,
  metadata: {},
  price: '1.0001',
};

const VALID_RESPONSE = {
  order: {
    id: ORDER_ID,
    clientOrderId: '2b810d09-b372-430b-b2b7-8d9576c30e75',
    profileId: 'f2a1c0de-0000-4000-8000-000000000001',
    account: ACCOUNT_ADDRESS,
    src: { asset: ASSET, amount: '1000000', usd: '1.00' },
    dest: {
      asset: ASSET,
      amount: '1000000',
      usd: '1.00',
      minAmount: '975000',
    },
    trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
    state: 'CANCELLED',
    timingData: {
      createdAt: '2026-09-03T11:02:13.000Z',
      expiresAt: '2026-09-10T15:27:54.000Z',
      closedAt: '2026-09-05T09:41:00.000Z',
    },
    isCancellable: false,
  },
  transactions: [
    {
      status: 'executed',
      txHash:
        '0x9f2b2a5cd6a2b0a5c1f4b9e0d0c1a2b3c4d5e6f708192a3b4c5d6e7f80912a3b',
      quoteId: 'quote-1',
      src: { asset: ASSET, amount: '1000000', usd: '1.00' },
      dest: { asset: ASSET, amount: '1000000', usd: '1.00' },
      timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
      feeData: { metamask: { amount: '0' } },
    },
  ],
};

describe('cancelLimitOrder', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_RESPONSE,
    } as Response);
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  it('deletes the order on behalf of its account and returns the validated response', async () => {
    const result = await cancelLimitOrder(CANCEL_PARAMS);

    expect(result).toStrictEqual(VALID_RESPONSE);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    const [url, requestOptions] = globalFetchSpy.mock.calls[0];
    const { pathname, searchParams } = new URL(url);
    expect(pathname).toMatch(new RegExp(`/v2/orders/limit/${ORDER_ID}$`, 'u'));
    expect(searchParams.get('accountAddress')).toBe(ACCOUNT_ADDRESS);
    expect(requestOptions).toMatchObject({
      method: 'DELETE',
      headers: {
        'X-Client-Id': 'mobile',
        Authorization: 'Bearer mock-bearer-token',
        'Client-Version': expect.any(String),
      },
    });
    expect(requestOptions.body).toBeUndefined();
  });

  it('keeps an order id that is not URL safe inside its path segment', async () => {
    await cancelLimitOrder({ ...CANCEL_PARAMS, orderId: '../limit?id=1' });

    const [url] = globalFetchSpy.mock.calls[0];
    const { pathname, searchParams } = new URL(url);
    expect(pathname).toMatch(/\/v2\/orders\/limit\/..%2Flimit%3Fid%3D1$/u);
    expect(searchParams.get('accountAddress')).toBe(ACCOUNT_ADDRESS);
  });

  it('throws a not open error when the API refuses to cancel an order that is no longer open', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({}),
    } as Response);

    await expect(cancelLimitOrder(CANCEL_PARAMS)).rejects.toBeInstanceOf(
      LimitOrderNotOpenError,
    );
  });

  it.each([401, 404, 500])(
    'throws a request error when the response status is %s',
    async (status) => {
      globalFetchSpy.mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
      } as Response);

      const request = cancelLimitOrder(CANCEL_PARAMS);

      await expect(request).rejects.toThrow(
        new RegExp(`status ${status}`, 'u'),
      );
      await expect(request).rejects.not.toBeInstanceOf(LimitOrderNotOpenError);
    },
  );

  it('throws a descriptive error when the response fails schema validation', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...VALID_RESPONSE,
        order: { ...VALID_RESPONSE.order, isCancellable: 'nope' },
      }),
    } as Response);

    await expect(cancelLimitOrder(CANCEL_PARAMS)).rejects.toThrow(
      /Invalid cancel limit order response/u,
    );
  });
});

describe('useCancelLimitOrder', () => {
  const WALLET_ADDRESS = '0x4751fd55e5b9723f427cf1a298f785ec2adcf123';
  const OPEN_ORDERS_KEY = limitOrdersQueries.getLimitOrders({
    walletAddress: WALLET_ADDRESS,
    states: [LimitOrderState.Open],
    chainId: 'eip155:143',
    limit: 20,
  }).queryKey;
  const HISTORY_KEY = limitOrdersQueries.getLimitOrders({
    walletAddress: WALLET_ADDRESS,
    states: [LimitOrderState.Filled, LimitOrderState.Cancelled],
    limit: 20,
  }).queryKey;
  const UNRELATED_KEY = ['RecurringOrdersDataService:getRecurringOrders', {}];

  let globalFetchSpy: jest.SpyInstance;
  let queryClient: QueryClient;

  const wrapper = ({ children }: PropsWithChildren) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_RESPONSE,
    } as Response);
    queryClient = new QueryClient();
    queryClient.setQueryData(OPEN_ORDERS_KEY, { pages: [], pageParams: [] });
    queryClient.setQueryData(HISTORY_KEY, { pages: [], pageParams: [] });
    queryClient.setQueryData(UNRELATED_KEY, { pages: [], pageParams: [] });
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
    queryClient.clear();
    jest.restoreAllMocks();
  });

  it('reports the order as cancelled and invalidates the open orders and the history', async () => {
    const { result } = renderHook(() => useCancelLimitOrder(), { wrapper });

    let outcome: CancelLimitOrderOutcome | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync(CANCEL_PARAMS);
    });

    expect(outcome).toBe(CancelLimitOrderOutcome.Cancelled);
    expect(queryClient.getQueryState(OPEN_ORDERS_KEY)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(HISTORY_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(UNRELATED_KEY)?.isInvalidated).toBe(false);
  });

  // The order has already filled, expired or failed, so it is in the history
  // now, not the open orders the user saw it in.
  it('reports an order that is no longer open, and invalidates the open orders and the history', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({}),
    } as Response);
    const { result } = renderHook(() => useCancelLimitOrder(), { wrapper });

    let outcome: CancelLimitOrderOutcome | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync(CANCEL_PARAMS);
    });

    expect(outcome).toBe(CancelLimitOrderOutcome.NotOpen);
    expect(result.current.isError).toBe(false);
    expect(queryClient.getQueryState(OPEN_ORDERS_KEY)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(HISTORY_KEY)?.isInvalidated).toBe(true);
  });

  it('stays pending until the orders are refreshed', async () => {
    let finishRefresh: () => void = () => undefined;
    jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(
      new Promise<void>((resolve) => {
        finishRefresh = resolve;
      }),
    );
    const { result } = renderHook(() => useCancelLimitOrder(), { wrapper });
    const onSettled = jest.fn();

    await act(async () => {
      result.current.mutate(CANCEL_PARAMS, { onSettled });
    });

    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: limitOrdersQueries.allOrdersKey(),
      }),
    );
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(onSettled).not.toHaveBeenCalled();

    await act(async () => {
      finishRefresh();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('still reports the order as cancelled when refreshing the orders fails', async () => {
    const refreshError = new Error('refresh failed');
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockRejectedValue(refreshError);
    const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation();
    const { result } = renderHook(() => useCancelLimitOrder(), { wrapper });

    let outcome: CancelLimitOrderOutcome | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync(CANCEL_PARAMS);
    });

    expect(outcome).toBe(CancelLimitOrderOutcome.Cancelled);
    expect(loggerSpy).toHaveBeenCalledWith(refreshError, expect.any(String));
  });

  it('leaves the orders alone when the order is not cancelled', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    const { result } = renderHook(() => useCancelLimitOrder(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(CANCEL_PARAMS)).rejects.toThrow(
        /status 500/u,
      );
    });

    expect(queryClient.getQueryState(OPEN_ORDERS_KEY)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(HISTORY_KEY)?.isInvalidated).toBe(false);
  });
});
