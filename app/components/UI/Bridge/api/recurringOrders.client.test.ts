import {
  createMockPrepareRecurringDelegationResponse,
  MOCK_RECURRING_ACCOUNT,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_PREPARE_QUERY,
} from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import {
  recurringOrdersApiClient,
  RecurringApiRequestError,
} from './recurringOrders.client';
import {
  RecurringOrderState,
  type CreateRecurringOrderRequest,
} from './recurringOrders.types';

const MOCK_BASE_URL = 'https://recurring-orders.test';
const mockGetBearerToken = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

jest.mock('./getRecurringOrdersBaseUrl', () => ({
  getRecurringOrdersBaseUrl: () => MOCK_BASE_URL,
}));

const PREPARE_QUERY = MOCK_RECURRING_PREPARE_QUERY;
const PREPARE_RESPONSE =
  createMockPrepareRecurringDelegationResponse(PREPARE_QUERY);
const CREATE_REQUEST: CreateRecurringOrderRequest = {
  accountAddress: PREPARE_QUERY.accountAddress,
  clientOrderId: PREPARE_QUERY.clientOrderId,
  src: {
    assetId: PREPARE_QUERY.srcAssetId,
    amount: PREPARE_QUERY.srcAmount,
  },
  dest: {
    assetId: PREPARE_QUERY.destAssetId,
  },
  priceTolerance: 0.5,
  schedule: {
    every: PREPARE_QUERY.every,
    unit: PREPARE_QUERY.unit,
    repeatCount: PREPARE_QUERY.repeatCount,
  },
  delegations: PREPARE_RESPONSE.delegations,
};
const API_ORDER = MOCK_RECURRING_OPEN_ORDER;
const API_SWAP = MOCK_RECURRING_OPEN_ORDER_SWAPS[0];
const ORDERS_RESPONSE = {
  orders: [API_ORDER],
  endCursor: 'next-orders',
  hasNextPage: true,
  total: 1,
};
const SWAPS_RESPONSE = {
  swaps: [API_SWAP],
  endCursor: 'next-swaps',
  hasNextPage: true,
  total: 1,
};
const ORDER_RESPONSE = { order: API_ORDER };

function createResponse(
  body: unknown,
  overrides: Partial<Response> = {},
): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    ...overrides,
  } as Response;
}

describe('recurring orders API client', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse({}));
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  it.each([
    {
      name: 'prepare',
      response: PREPARE_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.prepareRecurringDelegation(PREPARE_QUERY),
      contentType: false,
    },
    {
      name: 'create',
      response: ORDER_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.createRecurringOrder(CREATE_REQUEST),
      contentType: true,
    },
    {
      name: 'list',
      response: ORDERS_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.getRecurringOrders({
          accountAddress: MOCK_RECURRING_ACCOUNT,
        }),
      contentType: false,
    },
    {
      name: 'get one',
      response: ORDER_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.getRecurringOrder(
          MOCK_RECURRING_OPEN_ORDER.id,
          { accountAddress: MOCK_RECURRING_ACCOUNT },
        ),
      contentType: false,
    },
    {
      name: 'list swaps',
      response: SWAPS_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.getRecurringSwaps(
          MOCK_RECURRING_OPEN_ORDER.id,
          { accountAddress: MOCK_RECURRING_ACCOUNT },
        ),
      contentType: false,
    },
    {
      name: 'cancel',
      response: ORDER_RESPONSE,
      invoke: () =>
        recurringOrdersApiClient.cancelRecurringOrder(
          MOCK_RECURRING_OPEN_ORDER.id,
          { accountAddress: MOCK_RECURRING_ACCOUNT },
        ),
      contentType: false,
    },
  ])(
    'sends the current JWT and client headers on $name',
    async ({ response, invoke, contentType }) => {
      globalFetchSpy.mockResolvedValue(createResponse(response));

      await invoke();

      expect(mockGetBearerToken).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchSpy.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer mock-bearer-token',
        'X-Client-Id': 'mobile',
        'Client-Version': expect.any(String),
      });
      if (contentType) {
        expect(options.headers).toMatchObject({
          'Content-Type': 'application/json',
        });
      } else {
        expect(options.headers).not.toHaveProperty('Content-Type');
      }
      expect(url).not.toContain('profileId');
      expect(options.body ?? '').not.toContain('profileId');
    },
  );

  it('serializes every prepare parameter', async () => {
    globalFetchSpy.mockResolvedValue(createResponse(PREPARE_RESPONSE));

    const result =
      await recurringOrdersApiClient.prepareRecurringDelegation(PREPARE_QUERY);

    const url = new URL(globalFetchSpy.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${MOCK_BASE_URL}/v2/orders/recurring/delegations`,
    );
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      clientOrderId: PREPARE_QUERY.clientOrderId,
      accountAddress: PREPARE_QUERY.accountAddress,
      srcAssetId: PREPARE_QUERY.srcAssetId,
      srcAmount: PREPARE_QUERY.srcAmount,
      destAssetId: PREPARE_QUERY.destAssetId,
      every: '2',
      unit: 'day',
      repeatCount: '4',
    });
    expect(result).toStrictEqual(PREPARE_RESPONSE);
  });

  it.each([200, 201])('accepts create response status %s', async (status) => {
    globalFetchSpy.mockResolvedValue(
      createResponse(ORDER_RESPONSE, { status }),
    );

    const result =
      await recurringOrdersApiClient.createRecurringOrder(CREATE_REQUEST);

    const [url, options] = globalFetchSpy.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${MOCK_BASE_URL}/v2/orders/recurring`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toStrictEqual(CREATE_REQUEST);
    expect(result.order).toStrictEqual(API_ORDER);
  });

  it('serializes repeated list filters and the opaque cursor', async () => {
    globalFetchSpy.mockResolvedValue(createResponse(ORDERS_RESPONSE));

    const result = await recurringOrdersApiClient.getRecurringOrders({
      accountAddress: MOCK_RECURRING_ACCOUNT,
      states: [RecurringOrderState.Completed, RecurringOrderState.Cancelled],
      chainIds: ['eip155:1', 'eip155:56'],
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
      limit: 20,
      after: 'opaque-orders-cursor',
    });

    const url = new URL(globalFetchSpy.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${MOCK_BASE_URL}/v2/orders/recurring`,
    );
    expect(url.searchParams.get('accountAddress')).toBe(MOCK_RECURRING_ACCOUNT);
    expect(url.searchParams.getAll('states')).toStrictEqual([
      RecurringOrderState.Completed,
      RecurringOrderState.Cancelled,
    ]);
    expect(url.searchParams.getAll('chainIds')).toStrictEqual([
      'eip155:1',
      'eip155:56',
    ]);
    expect(url.searchParams.get('assetId')).toBe(
      MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
    );
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('after')).toBe('opaque-orders-cursor');
    expect(result).toStrictEqual({
      orders: [API_ORDER],
      endCursor: 'next-orders',
      hasNextPage: true,
      total: 1,
    });
  });

  it.each([
    {
      name: 'get one',
      invoke: () =>
        recurringOrdersApiClient.getRecurringOrder('order/id', {
          accountAddress: MOCK_RECURRING_ACCOUNT,
        }),
      response: ORDER_RESPONSE,
      path: '/v2/orders/recurring/order%2Fid',
      method: 'GET',
    },
    {
      name: 'list swaps',
      invoke: () =>
        recurringOrdersApiClient.getRecurringSwaps('order/id', {
          accountAddress: MOCK_RECURRING_ACCOUNT,
        }),
      response: SWAPS_RESPONSE,
      path: '/v2/orders/recurring/order%2Fid/swaps',
      method: 'GET',
    },
    {
      name: 'cancel',
      invoke: () =>
        recurringOrdersApiClient.cancelRecurringOrder('order/id', {
          accountAddress: MOCK_RECURRING_ACCOUNT,
        }),
      response: ORDER_RESPONSE,
      path: '/v2/orders/recurring/order%2Fid',
      method: 'DELETE',
    },
  ])(
    'encodes the order id and account on $name',
    async ({ invoke, response, path, method }) => {
      globalFetchSpy.mockResolvedValue(createResponse(response));

      await invoke();

      const [requestUrl, options] = globalFetchSpy.mock.calls[0] as [
        string,
        RequestInit,
      ];
      const url = new URL(requestUrl);
      expect(url.pathname).toBe(path);
      expect(options.method).toBe(method);
      expect(url.searchParams.get('accountAddress')).toBe(
        MOCK_RECURRING_ACCOUNT,
      );
    },
  );

  it('serializes list-swaps pagination', async () => {
    globalFetchSpy.mockResolvedValue(createResponse(SWAPS_RESPONSE));

    const result = await recurringOrdersApiClient.getRecurringSwaps(
      MOCK_RECURRING_OPEN_ORDER.id,
      {
        accountAddress: MOCK_RECURRING_ACCOUNT,
        limit: 50,
        after: 'opaque-swaps-cursor',
      },
    );

    const url = new URL(globalFetchSpy.mock.calls[0][0]);
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('after')).toBe('opaque-swaps-cursor');
    expect(result).toStrictEqual({
      swaps: [API_SWAP],
      endCursor: 'next-swaps',
      hasNextPage: true,
      total: 1,
    });
  });

  it.each([400, 401, 403, 404, 409, 500])(
    'throws a typed API error for status %s',
    async (status) => {
      globalFetchSpy.mockResolvedValue(
        createResponse(
          {
            code: `error_${status}`,
            message: `Request failed with ${status}`,
            details: { status },
          },
          { ok: false, status },
        ),
      );

      const request = recurringOrdersApiClient.getRecurringOrder(
        MOCK_RECURRING_OPEN_ORDER.id,
        { accountAddress: MOCK_RECURRING_ACCOUNT },
      );
      const error = await request.catch(
        (requestError: unknown) => requestError,
      );

      expect(error).toBeInstanceOf(RecurringApiRequestError);
      expect(error).toMatchObject({
        name: 'RecurringApiRequestError',
        status,
        code: `error_${status}`,
        message: `Request failed with ${status}`,
        details: { status },
      });
    },
  );

  it('falls back to an operation error for a malformed API error', async () => {
    globalFetchSpy.mockResolvedValue(
      createResponse({}, { ok: false, status: 401 }),
    );

    await expect(
      recurringOrdersApiClient.getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
      }),
    ).rejects.toThrow('getRecurringOrders: Request failed with status 401');
  });

  it('rejects a malformed successful response', async () => {
    globalFetchSpy.mockResolvedValue(createResponse({ orders: [API_ORDER] }));

    await expect(
      recurringOrdersApiClient.getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
      }),
    ).rejects.toThrow('Invalid recurring orders response');
  });
});
