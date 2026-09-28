import React, { type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { limitOrdersQueries } from '../../../queries/limitOrders';
import { LimitOrderState } from '../getLimitOrders/types';
import {
  createLimitOrder,
  useCreateLimitOrder,
  type CreateLimitOrderParams,
} from '.';

const mockGetBearerToken = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const SIGNED_DELEGATION = {
  purpose: 'swap' as const,
  delegation: {
    delegate: '0x0000000000000000000000000000000000000a11',
    delegator: '0x4751FD55E5B9723f427Cf1a298f785Ec2adCf123',
    authority:
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    caveats: [
      {
        enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
        terms: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
        args: '0x',
      },
    ],
    salt: '0x6572bcee6cc79e0b70128c9dd1f65f0075ebcac9b8aa38e8b6af0fa4757f2050',
    signature:
      '0x3fd1e0f4a0b6d5c8e7a49b1c2d3e4f50617283940a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829301b',
  },
  typedData: {
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: 56,
      verifyingContract: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    },
    primaryType: 'Delegation',
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }],
      Delegation: [{ name: 'delegate', type: 'address' }],
    },
    message: { delegate: '0x0000000000000000000000000000000000000a11' },
  },
};

const ORDER_PARAMS: CreateLimitOrderParams = {
  clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
  chainId: 56,
  trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
  requestedDestAmount: '1000000',
  priceTolerance: 2.5,
  delegations: [SIGNED_DELEGATION],
};

const ASSET = {
  chainId: 56,
  assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
  name: 'Tether USD',
  symbol: 'USDT',
  address: '0x55d398326f99059fF775485246999027B3197955',
  decimals: 18,
  iconUrl: 'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x55d3.png',
  coingeckoId: 'tether',
  aggregators: ['lifi'],
  occurrences: 3,
  fee: 0,
  metadata: {},
  price: '1.0001',
};

const VALID_RESPONSE = {
  order: {
    id: '2421deda-7395-4ec9-82b8-3384aa7320e4',
    clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
    profileId: 'f2a1c0de-0000-4000-8000-000000000001',
    account: 'eip155:56:0x4751fd55e5b9723f427cf1a298f785ec2adcf123',
    src: { asset: ASSET, amount: '1000000', usd: '1.00' },
    dest: {
      asset: ASSET,
      amount: '1000000',
      usd: '1.00',
      minAmount: '975000',
    },
    trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
    state: 'OPEN',
    timingData: {
      createdAt: '2026-09-03T11:02:13.000Z',
      expiresAt: '2026-09-10T15:27:54.000Z',
    },
    isCancellable: true,
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

describe('createLimitOrder', () => {
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

  it('posts the order params and returns the validated response', async () => {
    const result = await createLimitOrder(ORDER_PARAMS);

    expect(result).toStrictEqual(VALID_RESPONSE);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    const [url, requestOptions] = globalFetchSpy.mock.calls[0];
    expect(url).toContain('/v2/orders/limit');
    expect(requestOptions).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    });
    expect(JSON.parse(requestOptions.body)).toStrictEqual(ORDER_PARAMS);
  });

  it('accepts an order that has not filled yet', async () => {
    const { order } = VALID_RESPONSE;
    globalFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ order, transactions: [] }),
    } as Response);

    const result = await createLimitOrder(ORDER_PARAMS);

    expect(result.transactions).toStrictEqual([]);
  });

  it('throws when the response is not ok', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);

    await expect(createLimitOrder(ORDER_PARAMS)).rejects.toThrow(/status 400/u);
  });

  it('throws a descriptive error when the response fails schema validation', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...VALID_RESPONSE,
        order: { ...VALID_RESPONSE.order, isCancellable: 'nope' },
      }),
    } as Response);

    await expect(createLimitOrder(ORDER_PARAMS)).rejects.toThrow(
      /Invalid create limit order response/u,
    );
  });

  it('throws when the created order is missing entirely', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [] }),
    } as Response);

    await expect(createLimitOrder(ORDER_PARAMS)).rejects.toThrow(
      /Invalid create limit order response/u,
    );
  });
});

describe('useCreateLimitOrder', () => {
  const WALLET_ADDRESS = '0x4751fd55e5b9723f427cf1a298f785ec2adcf123';
  const OPEN_ORDERS_KEY = limitOrdersQueries.getLimitOrders({
    walletAddress: WALLET_ADDRESS,
    states: [LimitOrderState.Open],
    chainId: 'eip155:56',
    limit: 20,
  }).queryKey;
  const HISTORY_KEY = limitOrdersQueries.getLimitOrders({
    walletAddress: WALLET_ADDRESS,
    states: [LimitOrderState.Filled, LimitOrderState.Cancelled],
    limit: 20,
  }).queryKey;

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
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
    queryClient.clear();
  });

  it('invalidates the open orders once the order is created', async () => {
    const { result } = renderHook(() => useCreateLimitOrder(), { wrapper });

    await act(async () => {
      await result.current(ORDER_PARAMS);
    });

    expect(queryClient.getQueryState(OPEN_ORDERS_KEY)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(HISTORY_KEY)?.isInvalidated).toBe(false);
  });

  it('leaves the open orders alone when the order is not created', async () => {
    globalFetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);
    const { result } = renderHook(() => useCreateLimitOrder(), { wrapper });

    await act(async () => {
      await expect(result.current(ORDER_PARAMS)).rejects.toThrow(/status 400/u);
    });

    expect(queryClient.getQueryState(OPEN_ORDERS_KEY)?.isInvalidated).toBe(
      false,
    );
  });
});
