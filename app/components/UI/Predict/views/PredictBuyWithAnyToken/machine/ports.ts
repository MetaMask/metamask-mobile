import { Result } from '../../../types';

// ---- Port 1: Transaction Monitoring (deposit lifecycle) ----

export interface TransactionMonitorPort {
  onDepositStatusChange(
    callback: (
      event:
        | { status: 'confirmed'; transactionId: string }
        | { status: 'failed'; transactionId: string; error: string }
        | { status: 'rejected'; transactionId: string },
    ) => void,
  ): () => void;
}

// ---- Port 2: Approval Flow (cross-controller coordination) ----

export interface ApprovalPort {
  getApprovalTransactionId(): string | undefined;
  confirmApproval(): void;
  rejectApproval(): void;
}

// ---- Port 3: Navigation (lifecycle events) ----

export interface NavigationPort {
  pop(): void;
  onTransitionEnd(callback: () => void): () => void;
  onBeforeRemove(callback: () => void): () => void;
}

// ---- Port 4: Order Execution (provider delegation) ----

export interface OrderExecutionPort {
  placeOrder(): Promise<
    Result<{ spentAmount: string; receivedAmount: string }>
  >;
  initPayWithAnyToken(): Promise<Result<{ batchId: string }>>;
}

// ---- Simple deps (inlined, not ports) ----

export interface ToastPort {
  showOrderPlaced(): void;
  showDepositFailed(error: string): void;
}

export interface AnalyticsPort {
  trackOrderEvent(
    status: 'initiated' | 'submitted' | 'succeeded' | 'failed',
  ): void;
}

export interface QueryCachePort {
  invalidate(): void;
}

// ---- Aggregate for orchestrator constructor ----

export interface BuyOrderPorts {
  orderExecution: OrderExecutionPort;
  transactionMonitor: TransactionMonitorPort;
  approval: ApprovalPort;
  navigation: NavigationPort;
  toast: ToastPort;
  analytics: AnalyticsPort;
  queryCache: QueryCachePort;
  resetPaymentToken: () => void;
  logError: (error: string) => void;
}
