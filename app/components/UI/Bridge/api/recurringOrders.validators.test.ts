import { MOCK_RECURRING_OPEN_ORDER } from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import {
  parseCancelRecurringOrderResponse,
  parseListRecurringOrdersResponse,
  parseListRecurringSwapsResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';
import { RecurringSwapState } from './recurringOrders.types';

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

  it('rejects legacy order field names', () => {
    const {
      accountAddress,
      timingData: { startedAt, ...timingData },
      ...order
    } = MOCK_RECURRING_OPEN_ORDER;

    expect(() =>
      parseListRecurringOrdersResponse({
        orders: [
          {
            ...order,
            account: accountAddress,
            timingData: { ...timingData, startsAt: startedAt },
          },
        ],
        hasNextPage: false,
      }),
    ).toThrow('Invalid recurring orders response');
  });

  it('rejects missing required order fields', () => {
    const { profileId: _profileId, ...orderWithoutProfileId } =
      MOCK_RECURRING_OPEN_ORDER;

    expect(() =>
      parseListRecurringOrdersResponse({
        orders: [orderWithoutProfileId],
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

  it('rejects order states outside the ADR', () => {
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

    expect(() => parseListRecurringOrdersResponse(response)).toThrow(
      'Invalid recurring orders response',
    );
  });

  it('accepts additive order fields', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          futureField: 'future-value',
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
            currency: 'usd' as const,
            min: '2200',
            max: '1800',
          },
        },
      ],
      hasNextPage: false,
    };

    expect(parseListRecurringOrdersResponse(response)).toStrictEqual(response);
  });

  it('rejects uppercase price-range currency', () => {
    const response = {
      orders: [
        {
          ...MOCK_RECURRING_OPEN_ORDER,
          priceRange: {
            ...MOCK_RECURRING_OPEN_ORDER.priceRange,
            currency: 'USD',
          },
        },
      ],
      hasNextPage: false,
    };

    expect(() => parseListRecurringOrdersResponse(response)).toThrow(
      'Invalid recurring orders response',
    );
  });

  it('accepts skipped swaps without cross-field validation', () => {
    const skippedSwapWithoutReason = {
      ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
      state: RecurringSwapState.Skipped,
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

  it('rejects swap states outside the ADR', () => {
    const response = {
      swaps: [
        {
          ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
          state: 'future-swap-state',
        },
      ],
      hasNextPage: false,
    };

    expect(() => parseListRecurringSwapsResponse(response)).toThrow(
      'Invalid recurring swaps response',
    );
  });

  it('rejects the legacy swap status field', () => {
    const { state, ...swap } = MOCK_RECURRING_OPEN_ORDER_SWAPS[0];
    const response = {
      swaps: [{ ...swap, status: state }],
      hasNextPage: false,
    };

    expect(() => parseListRecurringSwapsResponse(response)).toThrow(
      'Invalid recurring swaps response',
    );
  });

  it('rejects swap legs without assets', () => {
    const swap = MOCK_RECURRING_OPEN_ORDER_SWAPS[0];
    const response = {
      swaps: [
        {
          ...swap,
          src: { amount: swap.src.amount },
          dest: { amount: swap.dest.amount },
        },
      ],
      hasNextPage: false,
    };

    expect(() => parseListRecurringSwapsResponse(response)).toThrow(
      'Invalid recurring swaps response',
    );
  });

  it('rejects skip reasons outside the ADR', () => {
    const response = {
      swaps: [
        {
          ...MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
          state: RecurringSwapState.Skipped,
          skipReason: 'future-skip-reason',
        },
      ],
      hasNextPage: false,
    };

    expect(() => parseListRecurringSwapsResponse(response)).toThrow(
      'Invalid recurring swaps response',
    );
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
      ({ state }) => state === RecurringSwapState.Failed,
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

  it('requires ADR pagination metadata', () => {
    const response = {
      orders: [MOCK_RECURRING_OPEN_ORDER],
    };

    expect(() => parseListRecurringOrdersResponse(response)).toThrow(
      'Invalid recurring orders response',
    );
  });
});
