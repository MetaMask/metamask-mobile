import { MOCK_RECURRING_OPEN_ORDER } from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import {
  parseCancelRecurringOrderResponse,
  parseGetRecurringOrdersResponse,
  parseListRecurringOrdersResponse,
  parseListRecurringSwapsResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';
import { RecurringSwapStatus } from './recurringOrders.types';

describe('recurring order validators', () => {
  it('parses a complete orders page', () => {
    const response = {
      orders: [MOCK_RECURRING_OPEN_ORDER],
      endCursor: 'next-page',
      hasNextPage: true,
    };

    const result = parseListRecurringOrdersResponse(response);

    expect(result).toStrictEqual(response);
  });

  it('rejects an order without canonical fill data', () => {
    const { fillData: _fillData, ...orderWithoutFillData } =
      MOCK_RECURRING_OPEN_ORDER;

    expect(() =>
      parseListRecurringOrdersResponse({
        orders: [orderWithoutFillData],
        hasNextPage: false,
      }),
    ).toThrow('Invalid recurring orders response');
  });

  it('accepts aggregate values without cross-field validation', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          fillData: {
            src: { amount: '1' },
            dest: { amount: '0' },
            count: 0,
          },
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('accepts pagination metadata without cross-field validation', () => {
    const response = {
      orders: [],
      hasNextPage: true,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('accepts unknown response states and warnings', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          state: 'future-order-state',
          warnings: ['future-warning'],
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('accepts schedule values for the backend to validate', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          schedule: {
            every: 6,
            unit: 'month' as const,
            repeatCount: 2,
          },
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('accepts price bounds for the backend to validate', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          priceRange: {
            side: 'dest' as const,
            currency: 'USD' as const,
            min: '2200',
            max: '1800',
          },
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('accepts skipped swaps without cross-field validation', () => {
    const skippedSwapWithoutReason = {
      ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
      status: RecurringSwapStatus.Skipped,
    };
    const response = {
      swaps: [skippedSwapWithoutReason],
      hasNextPage: false,
    };

    expect(parseListRecurringSwapsResponse(response)).toStrictEqual(response);
  });

  it('allows filled swaps without a skip reason', () => {
    const response = {
      swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[0]],
      hasNextPage: false,
    };

    const result = parseListRecurringSwapsResponse(response);

    expect(result).toStrictEqual(response);
  });

  it('accepts unknown response statuses and reasons', () => {
    const response = {
      swaps: [
        {
          ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
          status: 'future-swap-status',
          skipReason: 'future-skip-reason',
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringSwapsResponse(response)).toStrictEqual(response);
  });

  it('accepts optional swap fields without cross-field validation', () => {
    const response = {
      swaps: [
        {
          ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
          failureReason: 'Unexpected failure',
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringSwapsResponse(response)).toStrictEqual(response);
  });

  it('allows failed swaps to include a failure reason', () => {
    const failedSwap = MOCK_RECURRING_OPEN_ORDER_SWAPS.find(
      ({ status }) => status === RecurringSwapStatus.Failed,
    );
    if (!failedSwap) {
      throw new Error('Expected a failed recurring swap fixture');
    }

    expect(
      parseListRecurringSwapsResponse({
        swaps: [failedSwap],
        hasNextPage: false,
      }).swaps[0].failureReason,
    ).toBe(failedSwap.failureReason);
  });

  it('accepts a structurally valid cancellation response', () => {
    const response = {
      order: MOCK_RECURRING_OPEN_ORDER,
    };

    expect(parseCancelRecurringOrderResponse(response)).toStrictEqual(response);
  });

  it('accepts unknown API error codes', () => {
    const response = {
      code: 'future_error_code',
      message: 'Future backend error',
    };

    expect(parseRecurringApiError(response)).toStrictEqual(response);
  });

  it('parses the normalized Mobile pagination shape', () => {
    const response = {
      orders: [MOCK_RECURRING_OPEN_ORDER],
      nextCursor: 'next-page',
    };

    const result = parseGetRecurringOrdersResponse(response);

    expect(result).toStrictEqual(response);
  });
});
