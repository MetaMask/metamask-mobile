import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
} from './recurringOrders.mock';
import {
  type RecurringSwap,
  RecurringSwapStatus,
} from './recurringOrders.types';

const SOURCE_AMOUNT = '1500000000000000';
const DESTINATION_AMOUNT = '3000000';

function createMockTxHash(index: number): string {
  return `0x${String(index).padStart(64, 'm')}`;
}

function createFilledSwap(
  orderId: string,
  index: number,
  executedAt: string,
): RecurringSwap {
  return {
    swapId: `${orderId}-${index}`,
    orderId,
    status: RecurringSwapStatus.Filled,
    src: { amount: SOURCE_AMOUNT },
    dest: {
      amount: DESTINATION_AMOUNT,
      minAmount: '2985000',
    },
    requestId: `request-${orderId}-${index}`,
    txHash: createMockTxHash(index),
    scheduledAt: executedAt,
    executedAt,
  };
}

function createFilledSwaps(
  orderId: string,
  count: number,
  datePrefix: string,
): RecurringSwap[] {
  return Array.from({ length: count }, (_, index) =>
    createFilledSwap(
      orderId,
      index + 1,
      `${datePrefix}T${String(index + 10).padStart(2, '0')}:00:00.000Z`,
    ),
  );
}

export const MOCK_RECURRING_OPEN_ORDER_SWAPS: RecurringSwap[] = [
  createFilledSwap(
    MOCK_RECURRING_OPEN_ORDER.orderId,
    1,
    '2026-09-01T12:00:00.000Z',
  ),
  createFilledSwap(
    MOCK_RECURRING_OPEN_ORDER.orderId,
    2,
    '2026-09-02T12:00:00.000Z',
  ),
  {
    swapId: `${MOCK_RECURRING_OPEN_ORDER.orderId}-3`,
    orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'insufficient_balance',
    src: { amount: '0' },
    dest: { amount: '0' },
    scheduledAt: '2026-09-03T12:00:00.000Z',
    executedAt: '2026-09-03T12:00:00.000Z',
  },
  {
    swapId: `${MOCK_RECURRING_OPEN_ORDER.orderId}-4`,
    orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'out_of_price_range',
    src: { amount: '0' },
    dest: { amount: '0' },
    scheduledAt: '2026-09-04T12:00:00.000Z',
    executedAt: '2026-09-04T12:00:00.000Z',
  },
  {
    swapId: `${MOCK_RECURRING_OPEN_ORDER.orderId}-5`,
    orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
    status: RecurringSwapStatus.Failed,
    src: { amount: '0' },
    dest: { amount: '0' },
    requestId: `request-${MOCK_RECURRING_OPEN_ORDER.orderId}-5`,
    txHash: createMockTxHash(5),
    scheduledAt: '2026-09-05T12:00:00.000Z',
    executedAt: '2026-09-05T12:00:00.000Z',
  },
  {
    swapId: `${MOCK_RECURRING_OPEN_ORDER.orderId}-6`,
    orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'needs_smart_account',
    src: { amount: '0' },
    dest: { amount: '0' },
    scheduledAt: '2026-09-05T13:00:00.000Z',
    executedAt: '2026-09-05T13:00:00.000Z',
  },
];

export const MOCK_RECURRING_SWAPS_BY_ORDER_ID: Readonly<
  Record<string, RecurringSwap[]>
> = {
  [MOCK_RECURRING_OPEN_ORDER.orderId]: MOCK_RECURRING_OPEN_ORDER_SWAPS,
  [MOCK_RECURRING_OPEN_ORDER_2.orderId]: [],
  [MOCK_RECURRING_OPEN_ORDER_3.orderId]: createFilledSwaps(
    MOCK_RECURRING_OPEN_ORDER_3.orderId,
    MOCK_RECURRING_OPEN_ORDER_3.filledSwapsCount,
    '2026-09-03',
  ),
  [MOCK_RECURRING_COMPLETED_ORDER.orderId]: createFilledSwaps(
    MOCK_RECURRING_COMPLETED_ORDER.orderId,
    MOCK_RECURRING_COMPLETED_ORDER.filledSwapsCount,
    '2026-08-27',
  ),
  [MOCK_RECURRING_CANCELLED_ORDER.orderId]: createFilledSwaps(
    MOCK_RECURRING_CANCELLED_ORDER.orderId,
    MOCK_RECURRING_CANCELLED_ORDER.filledSwapsCount,
    '2026-08-26',
  ),
};
