// ---- States ----

export enum BuyOrderState {
  PREVIEW = 'preview',
  PAY_WITH_ANY_TOKEN = 'pay_with_any_token',
  DEPOSITING = 'depositing',
  PLACING_ORDER = 'placing_order',
  SUCCESS = 'success',
}

export interface BuyOrderMachineState {
  state: BuyOrderState;
  transactionId?: string;
  error?: string;
}

// ---- Events (inputs) ----

export type BuyOrderEvent =
  | { type: 'CONFIRM_BALANCE_PATH' }
  | { type: 'CONFIRM_ANY_TOKEN_PATH'; transactionId: string }
  | { type: 'DEPOSIT_CONFIRMED'; transactionId: string }
  | { type: 'DEPOSIT_FAILED'; transactionId: string; error: string }
  | { type: 'DEPOSIT_REJECTED'; transactionId: string }
  | { type: 'ORDER_SUCCEEDED'; spentAmount: string; receivedAmount: string }
  | { type: 'ORDER_FAILED'; error: string }
  | { type: 'SELECT_PAYMENT_TOKEN'; isBalanceToken: boolean }
  | { type: 'CLEANUP' };

// ---- Effects (outputs — data, not execution) ----

export type BuyOrderEffect =
  | {
      type: 'TRACK_ANALYTICS';
      status: 'initiated' | 'submitted' | 'succeeded' | 'failed';
    }
  | { type: 'PLACE_ORDER' }
  | { type: 'STORE_PENDING_ORDER'; transactionId: string }
  | { type: 'CLEAR_PENDING_ORDER'; transactionId: string }
  | {
      type: 'SHOW_TOAST';
      variant: 'order_placed' | 'deposit_failed';
      message?: string;
    }
  | { type: 'INVALIDATE_QUERY_CACHE' }
  | { type: 'NAVIGATE_POP' }
  | { type: 'INIT_PAY_WITH_ANY_TOKEN' }
  | { type: 'CONFIRM_APPROVAL' }
  | { type: 'REJECT_APPROVAL' }
  | { type: 'RESET_PAYMENT_TOKEN' }
  | { type: 'CLEAR_OPTIMISTIC_POSITION' }
  | { type: 'PUBLISH_ORDER_CONFIRMED' }
  | { type: 'PUBLISH_ORDER_FAILED' }
  | { type: 'PUBLISH_DEPOSIT_FAILED' }
  | { type: 'LOG_ERROR'; error: string };

// ---- Transition result ----

export interface TransitionResult {
  nextState: BuyOrderMachineState | null;
  effects: BuyOrderEffect[];
}
