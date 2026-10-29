import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_EXPIRED_ORDER,
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
  return `0x${index.toString(16).padStart(64, '0')}`;
}

function createFilledSwap(
  orderId: string,
  index: number,
  executedAt: string,
): RecurringSwap {
  return {
    id: `${orderId}-${index}`,
    status: RecurringSwapStatus.Filled,
    src: { amount: SOURCE_AMOUNT },
    dest: {
      amount: DESTINATION_AMOUNT,
      minAmount: '2985000',
    },
    txHash: createMockTxHash(index),
    quoteId: `quote-${orderId}-${index}`,
    timingData: {
      scheduledAt: executedAt,
      executedAt,
    },
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
  createFilledSwap(MOCK_RECURRING_OPEN_ORDER.id, 1, '2026-09-01T12:00:00.000Z'),
  createFilledSwap(MOCK_RECURRING_OPEN_ORDER.id, 2, '2026-09-02T12:00:00.000Z'),
  {
    id: `${MOCK_RECURRING_OPEN_ORDER.id}-3`,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'insufficient_balance',
    src: { amount: '0' },
    dest: { amount: '0' },
    timingData: {
      scheduledAt: '2026-09-03T12:00:00.000Z',
      executedAt: '2026-09-03T12:00:00.000Z',
    },
  },
  {
    id: `${MOCK_RECURRING_OPEN_ORDER.id}-4`,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'out_of_price_range',
    src: { amount: '0' },
    dest: { amount: '0' },
    timingData: {
      scheduledAt: '2026-09-04T12:00:00.000Z',
      executedAt: '2026-09-04T12:00:00.000Z',
    },
  },
  {
    id: `${MOCK_RECURRING_OPEN_ORDER.id}-5`,
    status: RecurringSwapStatus.Failed,
    failureReason: 'Transaction reverted',
    src: { amount: '0' },
    dest: { amount: '0' },
    quoteId: `quote-${MOCK_RECURRING_OPEN_ORDER.id}-5`,
    txHash: createMockTxHash(5),
    timingData: {
      scheduledAt: '2026-09-05T12:00:00.000Z',
      executedAt: '2026-09-05T12:00:00.000Z',
    },
  },
  {
    id: `${MOCK_RECURRING_OPEN_ORDER.id}-6`,
    status: RecurringSwapStatus.Skipped,
    skipReason: 'needs_smart_account',
    src: { amount: '0' },
    dest: { amount: '0' },
    timingData: {
      scheduledAt: '2026-09-05T13:00:00.000Z',
      executedAt: '2026-09-05T13:00:00.000Z',
    },
  },
];

export const MOCK_RECURRING_SWAPS_BY_ORDER_ID: Readonly<
  Record<string, RecurringSwap[]>
> = {
  [MOCK_RECURRING_OPEN_ORDER.id]: MOCK_RECURRING_OPEN_ORDER_SWAPS,
  [MOCK_RECURRING_OPEN_ORDER_2.id]: [],
  [MOCK_RECURRING_OPEN_ORDER_3.id]: createFilledSwaps(
    MOCK_RECURRING_OPEN_ORDER_3.id,
    MOCK_RECURRING_OPEN_ORDER_3.fillData.count,
    '2026-09-03',
  ),
  [MOCK_RECURRING_COMPLETED_ORDER.id]: createFilledSwaps(
    MOCK_RECURRING_COMPLETED_ORDER.id,
    MOCK_RECURRING_COMPLETED_ORDER.fillData.count,
    '2026-08-27',
  ),
  [MOCK_RECURRING_CANCELLED_ORDER.id]: createFilledSwaps(
    MOCK_RECURRING_CANCELLED_ORDER.id,
    MOCK_RECURRING_CANCELLED_ORDER.fillData.count,
    '2026-08-26',
  ),
  [MOCK_RECURRING_EXPIRED_ORDER.id]: createFilledSwaps(
    MOCK_RECURRING_EXPIRED_ORDER.id,
    MOCK_RECURRING_EXPIRED_ORDER.fillData.count,
    '2026-08-25',
  ),
};
