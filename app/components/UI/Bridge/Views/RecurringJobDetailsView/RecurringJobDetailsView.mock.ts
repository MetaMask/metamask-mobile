import { strings } from '../../../../../../locales/i18n';
import type { BridgeToken } from '../../types';
import {
  type RecurringJob,
  RecurringJobStatus,
  RecurringOrderStatus,
} from './RecurringJobDetailsView.types';

export const MOCK_RECURRING_OPEN_JOB_ID = 'mock-recurring-job-open';
export const MOCK_RECURRING_OPEN_JOB_SECONDARY_ID =
  'mock-recurring-job-open-secondary';
export const MOCK_RECURRING_OPEN_JOB_TERTIARY_ID =
  'mock-recurring-job-open-tertiary';
export const MOCK_RECURRING_COMPLETED_JOB_ID = 'mock-recurring-job-completed';

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

export const MOCK_RECURRING_OPEN_JOB: RecurringJob = {
  jobId: MOCK_RECURRING_OPEN_JOB_ID,
  status: RecurringJobStatus.InProgress,
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
  orders: [
    {
      orderId: `${MOCK_RECURRING_OPEN_JOB_ID}-order-1`,
      status: RecurringOrderStatus.Filled,
      statusLabel: strings('bridge.recurring.filled'),
      receivedAmount: '+3 USDC',
      spentAmount: '-0.0015 ETH',
    },
    {
      orderId: `${MOCK_RECURRING_OPEN_JOB_ID}-order-2`,
      status: RecurringOrderStatus.Filled,
      statusLabel: strings('bridge.recurring.filled'),
      receivedAmount: '+3 USDC',
      spentAmount: '-0.0015 ETH',
    },
    {
      orderId: `${MOCK_RECURRING_OPEN_JOB_ID}-order-3`,
      status: RecurringOrderStatus.Warning,
      statusLabel: strings('bridge.recurring.not_enough_gas'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
    {
      orderId: `${MOCK_RECURRING_OPEN_JOB_ID}-order-4`,
      status: RecurringOrderStatus.Warning,
      statusLabel: strings('bridge.recurring.out_of_price_range'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
    {
      orderId: `${MOCK_RECURRING_OPEN_JOB_ID}-order-5`,
      status: RecurringOrderStatus.Failed,
      statusLabel: strings('bridge.recurring.failed'),
      receivedAmount: '+0 USDC',
      spentAmount: '-0 ETH',
    },
  ],
};

export const MOCK_RECURRING_OPEN_JOB_SECONDARY: RecurringJob = {
  ...MOCK_RECURRING_OPEN_JOB,
  jobId: MOCK_RECURRING_OPEN_JOB_SECONDARY_ID,
  filledAmount: '0.0015',
  totalReceived: '3 USDC',
  startDate: 'Sep 2, 2026',
  endDate: 'Sep 6, 2026',
  orders: MOCK_RECURRING_OPEN_JOB.orders.map((order, index) => ({
    ...order,
    orderId: `${MOCK_RECURRING_OPEN_JOB_SECONDARY_ID}-order-${index + 1}`,
    ...(index === 1
      ? {
          status: RecurringOrderStatus.Warning,
          statusLabel: strings('bridge.recurring.not_enough_gas'),
          receivedAmount: '+0 USDC',
          spentAmount: '-0 ETH',
        }
      : {}),
  })),
};

export const MOCK_RECURRING_OPEN_JOB_TERTIARY: RecurringJob = {
  ...MOCK_RECURRING_OPEN_JOB,
  jobId: MOCK_RECURRING_OPEN_JOB_TERTIARY_ID,
  filledAmount: '0.0045',
  totalReceived: '9 USDC',
  startDate: 'Sep 3, 2026',
  endDate: 'Sep 7, 2026',
  orders: MOCK_RECURRING_OPEN_JOB.orders.map((order, index) => ({
    ...order,
    orderId: `${MOCK_RECURRING_OPEN_JOB_TERTIARY_ID}-order-${index + 1}`,
    ...(index === 2
      ? {
          status: RecurringOrderStatus.Filled,
          statusLabel: strings('bridge.recurring.filled'),
          receivedAmount: '+3 USDC',
          spentAmount: '-0.0015 ETH',
        }
      : {}),
  })),
};

export const MOCK_RECURRING_COMPLETED_JOB: RecurringJob = {
  jobId: MOCK_RECURRING_COMPLETED_JOB_ID,
  status: RecurringJobStatus.Completed,
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
  orders: Array.from({ length: 5 }, (_, index) => ({
    orderId: `${MOCK_RECURRING_COMPLETED_JOB_ID}-order-${index + 1}`,
    status: RecurringOrderStatus.Filled,
    statusLabel: strings('bridge.recurring.filled'),
    receivedAmount: '+3 USDC',
    spentAmount: '-0.0015 ETH',
  })),
};

export const RECURRING_JOBS_BY_ID: Readonly<
  Partial<Record<string, RecurringJob>>
> = {
  [MOCK_RECURRING_OPEN_JOB.jobId]: MOCK_RECURRING_OPEN_JOB,
  [MOCK_RECURRING_OPEN_JOB_SECONDARY.jobId]: MOCK_RECURRING_OPEN_JOB_SECONDARY,
  [MOCK_RECURRING_OPEN_JOB_TERTIARY.jobId]: MOCK_RECURRING_OPEN_JOB_TERTIARY,
  [MOCK_RECURRING_COMPLETED_JOB.jobId]: MOCK_RECURRING_COMPLETED_JOB,
};

export function getRecurringJobOrderCounts(job: RecurringJob) {
  const totalOrderCount = job.orders.length;
  const filledOrderCount = job.orders.filter(
    ({ status }) => status === RecurringOrderStatus.Filled,
  ).length;
  const filledPercent =
    totalOrderCount === 0
      ? 0
      : Math.round((filledOrderCount / totalOrderCount) * 100);

  return {
    totalOrderCount,
    filledOrderCount,
    filledPercent,
  };
}
