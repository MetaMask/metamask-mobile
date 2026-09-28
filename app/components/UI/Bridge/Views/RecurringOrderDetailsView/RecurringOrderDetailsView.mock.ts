import { strings } from '../../../../../../locales/i18n';
import type { BridgeToken } from '../../types';
import {
  type RecurringOrder,
  RecurringOrderStatus,
  RecurringSwapStatus,
} from './RecurringOrderDetailsView.types';

export const MOCK_RECURRING_OPEN_ORDER_ID = 'mock-recurring-order-open';
export const MOCK_RECURRING_OPEN_ORDER_SECONDARY_ID =
  'mock-recurring-order-open-secondary';
export const MOCK_RECURRING_OPEN_ORDER_TERTIARY_ID =
  'mock-recurring-order-open-tertiary';
export const MOCK_RECURRING_COMPLETED_ORDER_ID =
  'mock-recurring-order-completed';

const MOCK_SOURCE_TOKEN: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  decimals: 18,
  symbol: 'ETH',
  name: 'Ethereum',
};

const MOCK_DESTINATION_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

export const MOCK_RECURRING_OPEN_ORDER: RecurringOrder = {
  orderId: MOCK_RECURRING_OPEN_ORDER_ID,
  status: RecurringOrderStatus.InProgress,
  sourceToken: MOCK_SOURCE_TOKEN,
  destinationToken: MOCK_DESTINATION_TOKEN,
  filledAmount: '0.003',
  totalSourceAmount: '0.0075 ETH',
  interval: '1 day',
  sizePerOrder: '0.0015 ETH',
  priceRange: '--',
  totalReceived: '6 USDC',
  averageExecutionPrice: '$2,000.00',
  startDate: 'Sep 1, 2026',
  endDate: 'Sep 5, 2026',
  swaps: [
    {
      swapId: `${MOCK_RECURRING_OPEN_ORDER_ID}-swap-1`,
      status: RecurringSwapStatus.Filled,
      statusLabel: strings('bridge.recurring.filled'),
      receivedAmount: '+3 USDC',
      spentAmount: '-0.0015 ETH',
    },
    {
      swapId: `${MOCK_RECURRING_OPEN_ORDER_ID}-swap-2`,
      status: RecurringSwapStatus.Filled,
      statusLabel: strings('bridge.recurring.filled'),
      receivedAmount: '+3 USDC',
      spentAmount: '-0.0015 ETH',
    },
    {
      swapId: `${MOCK_RECURRING_OPEN_ORDER_ID}-swap-3`,
      status: RecurringSwapStatus.Warning,
      statusLabel: strings('bridge.recurring.not_enough_gas'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
    {
      swapId: `${MOCK_RECURRING_OPEN_ORDER_ID}-swap-4`,
      status: RecurringSwapStatus.Warning,
      statusLabel: strings('bridge.recurring.out_of_price_range'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
    {
      swapId: `${MOCK_RECURRING_OPEN_ORDER_ID}-swap-5`,
      status: RecurringSwapStatus.Failed,
      statusLabel: strings('bridge.recurring.failed'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
  ],
};

export const MOCK_RECURRING_OPEN_ORDER_SECONDARY: RecurringOrder = {
  ...MOCK_RECURRING_OPEN_ORDER,
  orderId: MOCK_RECURRING_OPEN_ORDER_SECONDARY_ID,
  filledAmount: '0.0015',
  totalReceived: '3 USDC',
  startDate: 'Sep 2, 2026',
  endDate: 'Sep 6, 2026',
  swaps: MOCK_RECURRING_OPEN_ORDER.swaps.map((swap, index) => ({
    ...swap,
    swapId: `${MOCK_RECURRING_OPEN_ORDER_SECONDARY_ID}-swap-${index + 1}`,
    ...(index === 1
      ? {
          status: RecurringSwapStatus.Warning,
          statusLabel: strings('bridge.recurring.not_enough_gas'),
          receivedAmount: '+0 USDC',
          spentAmount: '-0 ETH',
        }
      : {}),
  })),
};

export const MOCK_RECURRING_OPEN_ORDER_TERTIARY: RecurringOrder = {
  ...MOCK_RECURRING_OPEN_ORDER,
  orderId: MOCK_RECURRING_OPEN_ORDER_TERTIARY_ID,
  filledAmount: '0.0045',
  totalReceived: '9 USDC',
  startDate: 'Sep 3, 2026',
  endDate: 'Sep 7, 2026',
  swaps: MOCK_RECURRING_OPEN_ORDER.swaps.map((swap, index) => ({
    ...swap,
    swapId: `${MOCK_RECURRING_OPEN_ORDER_TERTIARY_ID}-swap-${index + 1}`,
    ...(index === 2
      ? {
          status: RecurringSwapStatus.Filled,
          statusLabel: strings('bridge.recurring.filled'),
          receivedAmount: '+3 USDC',
          spentAmount: '-0.0015 ETH',
        }
      : {}),
  })),
};

export const MOCK_RECURRING_COMPLETED_ORDER: RecurringOrder = {
  orderId: MOCK_RECURRING_COMPLETED_ORDER_ID,
  status: RecurringOrderStatus.Completed,
  sourceToken: MOCK_SOURCE_TOKEN,
  destinationToken: MOCK_DESTINATION_TOKEN,
  filledAmount: '0.0075',
  totalSourceAmount: '0.0075 ETH',
  interval: '1 day',
  sizePerOrder: '0.0015 ETH',
  priceRange: '--',
  totalReceived: '15 USDC',
  averageExecutionPrice: '$2,000.00',
  startDate: 'Aug 27, 2026',
  endDate: 'Aug 31, 2026',
  swaps: Array.from({ length: 5 }, (_, index) => ({
    swapId: `${MOCK_RECURRING_COMPLETED_ORDER_ID}-swap-${index + 1}`,
    status: RecurringSwapStatus.Filled,
    statusLabel: strings('bridge.recurring.filled'),
    receivedAmount: '+3 USDC',
    spentAmount: '-0.0015 ETH',
  })),
};

export const RECURRING_ORDERS_BY_ID: Readonly<
  Partial<Record<string, RecurringOrder>>
> = {
  [MOCK_RECURRING_OPEN_ORDER.orderId]: MOCK_RECURRING_OPEN_ORDER,
  [MOCK_RECURRING_OPEN_ORDER_SECONDARY.orderId]:
    MOCK_RECURRING_OPEN_ORDER_SECONDARY,
  [MOCK_RECURRING_OPEN_ORDER_TERTIARY.orderId]:
    MOCK_RECURRING_OPEN_ORDER_TERTIARY,
  [MOCK_RECURRING_COMPLETED_ORDER.orderId]: MOCK_RECURRING_COMPLETED_ORDER,
};

export function getRecurringOrderSwapCounts(order: RecurringOrder) {
  const totalSwapCount = order.swaps.length;
  const filledSwapCount = order.swaps.filter(
    ({ status }) => status === RecurringSwapStatus.Filled,
  ).length;
  const filledPercent =
    totalSwapCount === 0
      ? 0
      : Math.round((filledSwapCount / totalSwapCount) * 100);

  return {
    totalSwapCount,
    filledSwapCount,
    filledPercent,
  };
}
