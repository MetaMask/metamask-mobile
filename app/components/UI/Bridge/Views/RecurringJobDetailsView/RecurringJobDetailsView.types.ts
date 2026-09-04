import type { BridgeToken } from '../../types';

export enum RecurringJobStatus {
  InProgress = 'inProgress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum RecurringOrderStatus {
  Warning = 'warning',
  Failed = 'failed',
  Filled = 'filled',
}

export interface RecurringOrder {
  orderId: string;
  status: RecurringOrderStatus;
  statusLabel: string;
  receivedAmount: string;
  spentAmount: string;
}

export interface RecurringJob {
  jobId: string;
  status: RecurringJobStatus;
  sourceToken: BridgeToken;
  destinationToken: BridgeToken;
  filledAmount: string;
  totalSourceAmount: string;
  interval: string;
  sizePerOrder: string;
  priceRange: string;
  totalReceived: string;
  averageExecutionPrice: string;
  startDate: string;
  endDate: string;
  orders: RecurringOrder[];
}

export interface RecurringJobDetailsRouteParams {
  jobId: string;
}

export type OnRecurringJobPress = (jobId: string) => void;
