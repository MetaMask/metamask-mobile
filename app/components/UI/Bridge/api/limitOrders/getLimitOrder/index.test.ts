import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import { getLimitOrder, type GetLimitOrderParams } from '.';

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

const GET_PARAMS: GetLimitOrderParams = {
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
    state: 'OPEN',
    timingData: {
      createdAt: '2026-09-03T11:02:13.000Z',
      expiresAt: '2026-09-10T15:27:54.000Z',
      closedAt: '2026-09-05T09:41:00.000Z',
    },
    isCancellable: true,
    failureReason: 'DRY_RUN',
  },
  transactions: [
    {
      status: 'executed',
      txHash:
        '0x9f2b2a5cd6a2b0a5c1f4b9e0d0c1a2b3c4d5e6f708192a3b4c5d6e7f80912a3b',
      quoteId: 'quote-1',
      src: { asset: ASSET, amount: '1000000', usd: '1.00' },
      dest: { asset: ASSET, amount: '1000000', usd: '1.00' },
      timingData: {
        createdAt: '2026-09-03T11:02:13.000Z',
        expiresAt: '2026-09-10T15:27:54.000Z',
        closedAt: '2026-09-05T09:41:00.000Z',
      },
      feeData: { metamask: { amount: '0' } },
    },
  ],
};

describe('getLimitOrder', () => {
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

  it('requests the order on behalf of its account', async () => {
    await getLimitOrder(GET_PARAMS);

    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    const [requestedUrl, requestOptions] = globalFetchSpy.mock.calls[0];
    const url = new URL(requestedUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${BRIDGE_API_BASE_URL}/v2/orders/limit`,
    );
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      id: ORDER_ID,
      accountAddress: ACCOUNT_ADDRESS,
    });
    expect(requestOptions).toMatchObject({
      method: 'GET',
      headers: {
        'X-Client-Id': 'mobile',
        Authorization: 'Bearer mock-bearer-token',
        'Client-Version': expect.any(String),
      },
    });
  });

  it('keeps an order id that is not URL safe inside its query param', async () => {
    const orderId = 'order&id=other';

    await getLimitOrder({ ...GET_PARAMS, orderId });

    const url = new URL(globalFetchSpy.mock.calls[0][0]);
    expect(url.searchParams.getAll('id')).toStrictEqual([orderId]);
    expect(url.searchParams.get('accountAddress')).toBe(ACCOUNT_ADDRESS);
  });

  it('returns the order and its transactions as the API sent them', async () => {
    const result = await getLimitOrder(GET_PARAMS);

    expect(result).toStrictEqual(VALID_RESPONSE);
  });

  it.each([401, 404, 500])(
    'throws a request error when the response status is %s',
    async (status) => {
      globalFetchSpy.mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
      } as Response);

      await expect(getLimitOrder(GET_PARAMS)).rejects.toThrow(
        new RegExp(`status ${status}`, 'u'),
      );
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

    await expect(getLimitOrder(GET_PARAMS)).rejects.toThrow(
      /Invalid limit order response/u,
    );
  });
});
