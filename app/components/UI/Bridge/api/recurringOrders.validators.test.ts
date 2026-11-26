import {
  createMockPrepareRecurringDelegationResponse,
  MOCK_RECURRING_EXPIRED_ORDER,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_PREPARE_QUERY,
} from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import {
  parseCancelRecurringOrderResponse,
  parseCreateRecurringOrderResponse,
  parseGetRecurringOrderResponse,
  parseListRecurringOrdersResponse,
  parseListRecurringSwapsResponse,
  parsePrepareRecurringDelegationResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';
import {
  RecurringOrderState,
  RecurringSwapStatus,
} from './recurringOrders.types';

describe('recurring order validators', () => {
  const apiOrder = MOCK_RECURRING_OPEN_ORDER;

  it('accepts the Swagger order page unchanged', () => {
    expect(
      parseListRecurringOrdersResponse({
        orders: [apiOrder],
        endCursor: 'next-page',
        hasNextPage: true,
        total: 1,
      }),
    ).toStrictEqual({
      orders: [apiOrder],
      endCursor: 'next-page',
      hasNextPage: true,
      total: 1,
    });
  });

  it('keeps an expired cancellation canonical', () => {
    const response = parseGetRecurringOrderResponse({
      order: MOCK_RECURRING_EXPIRED_ORDER,
    });

    expect(response.order).toStrictEqual(MOCK_RECURRING_EXPIRED_ORDER);
    expect(response.order).toMatchObject({
      state: RecurringOrderState.Cancelled,
      cancelReason: 'delegation_expired',
    });
  });

  it('keeps documented attempt metadata canonical', () => {
    const orderWithoutIssues = {
      ...apiOrder,
      warnings: [],
      fillData: {
        ...apiOrder.fillData,
        skippedCount: 0,
        failedCount: 0,
      },
    };
    const orderWithSkippedAttempt = {
      ...orderWithoutIssues,
      fillData: {
        ...orderWithoutIssues.fillData,
        skippedCount: 1,
      },
    };

    expect(
      parseGetRecurringOrderResponse({ order: orderWithoutIssues }).order,
    ).toStrictEqual(orderWithoutIssues);
    expect(
      parseGetRecurringOrderResponse({ order: orderWithSkippedAttempt }).order,
    ).toStrictEqual(orderWithSkippedAttempt);
  });

  it.each([
    parseCreateRecurringOrderResponse,
    parseCancelRecurringOrderResponse,
  ])('accepts an order envelope unchanged', (parseEnvelope) => {
    expect(parseEnvelope({ order: apiOrder })).toStrictEqual({
      order: apiOrder,
    });
  });

  it('requires a numeric price tolerance in order responses', () => {
    const { priceTolerance: _priceTolerance, ...orderWithoutPriceTolerance } =
      apiOrder;

    expect(() =>
      parseGetRecurringOrderResponse({
        order: orderWithoutPriceTolerance,
      }),
    ).toThrow('Invalid recurring order response');
    expect(() =>
      parseGetRecurringOrderResponse({
        order: { ...apiOrder, priceTolerance: '3' },
      }),
    ).toThrow('Invalid recurring order response');
  });

  it('accepts the documented limit-order delegation response', () => {
    const response = createMockPrepareRecurringDelegationResponse(
      MOCK_RECURRING_PREPARE_QUERY,
    );

    expect(parsePrepareRecurringDelegationResponse(response)).toStrictEqual(
      response,
    );
  });

  it('requires uppercase USD in the API order', () => {
    expect(() =>
      parseGetRecurringOrderResponse({
        order: {
          ...apiOrder,
          priceRange: {
            ...apiOrder.priceRange,
            currency: 'usd',
          },
        },
      }),
    ).toThrow('Invalid recurring order response');
  });

  it('requires documented order pagination metadata', () => {
    expect(() =>
      parseListRecurringOrdersResponse({
        orders: [apiOrder],
        hasNextPage: false,
      }),
    ).toThrow('Invalid recurring orders response');
  });

  it.each(['not_enough_gas', 'execution_failed'] as const)(
    'accepts the documented %s skip reason',
    (skipReason) => {
      const apiSwap = {
        ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
        status: RecurringSwapStatus.Skipped,
        skipReason,
      };

      expect(
        parseListRecurringSwapsResponse({
          swaps: [apiSwap],
          hasNextPage: false,
          total: 1,
        }).swaps[0],
      ).toMatchObject({
        status: RecurringSwapStatus.Skipped,
        skipReason,
      });
    },
  );

  it('rejects undocumented swap statuses', () => {
    expect(() =>
      parseListRecurringSwapsResponse({
        swaps: [
          {
            ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
            status: 'future-status',
          },
        ],
        hasNextPage: false,
        total: 1,
      }),
    ).toThrow('Invalid recurring swaps response');
  });

  it('accepts unknown API error codes', () => {
    const response = {
      code: 'future_error_code',
      message: 'Future backend error',
    };

    expect(parseRecurringApiError(response)).toStrictEqual(response);
  });
});
