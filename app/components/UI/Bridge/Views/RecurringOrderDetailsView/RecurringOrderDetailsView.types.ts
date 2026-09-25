import type { BridgeToken } from '../../types';

export enum RecurringOrderStatus {
  InProgress = 'inProgress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum RecurringSwapStatus {
  Warning = 'warning',
  Failed = 'failed',
  Filled = 'filled',
}

export interface RecurringSwap {
  swapId: string;
  status: RecurringSwapStatus;
  statusLabel: string;
  receivedAmount: string;
  spentAmount: string;
}

export interface RecurringOrder {
  orderId: string;
  status: RecurringOrderStatus;
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
  swaps: RecurringSwap[];
}

export interface RecurringOrderDetailsRouteParams {
  orderId: string;
}

export type OnRecurringOrderPress = (orderId: string) => void;
