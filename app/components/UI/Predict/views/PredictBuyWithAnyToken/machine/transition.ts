import {
  BuyOrderState,
  BuyOrderMachineState,
  BuyOrderEvent,
  BuyOrderEffect,
  TransitionResult,
} from './types';

const NO_CHANGE = (current: BuyOrderMachineState | null): TransitionResult => ({
  nextState: current,
  effects: [],
});

function transitionFromPreview(
  current: BuyOrderMachineState,
  event: BuyOrderEvent,
): TransitionResult {
  switch (event.type) {
    case 'CONFIRM_BALANCE_PATH':
      return {
        nextState: { ...current, state: BuyOrderState.PLACING_ORDER },
        effects: [
          { type: 'TRACK_ANALYTICS', status: 'submitted' },
          { type: 'PLACE_ORDER' },
        ],
      };

    case 'SELECT_PAYMENT_TOKEN':
      if (event.isBalanceToken) {
        return NO_CHANGE(current);
      }
      return {
        nextState: {
          ...current,
          state: BuyOrderState.PAY_WITH_ANY_TOKEN,
          error: undefined,
        },
        effects: [],
      };

    case 'CLEANUP':
      return {
        nextState: null,
        effects: [{ type: 'REJECT_APPROVAL' }, { type: 'RESET_PAYMENT_TOKEN' }],
      };

    default:
      return NO_CHANGE(current);
  }
}

function transitionFromPayWithAnyToken(
  current: BuyOrderMachineState,
  event: BuyOrderEvent,
): TransitionResult {
  switch (event.type) {
    case 'CONFIRM_ANY_TOKEN_PATH':
      return {
        nextState: {
          ...current,
          state: BuyOrderState.DEPOSITING,
          transactionId: event.transactionId,
        },
        effects: [
          { type: 'CONFIRM_APPROVAL' },
          { type: 'STORE_PENDING_ORDER', transactionId: event.transactionId },
          { type: 'TRACK_ANALYTICS', status: 'submitted' },
        ],
      };

    case 'SELECT_PAYMENT_TOKEN':
      if (!event.isBalanceToken) {
        return NO_CHANGE(current);
      }
      return {
        nextState: {
          ...current,
          state: BuyOrderState.PREVIEW,
          error: undefined,
        },
        effects: [{ type: 'RESET_PAYMENT_TOKEN' }],
      };

    case 'CLEANUP':
      return {
        nextState: null,
        effects: [{ type: 'REJECT_APPROVAL' }, { type: 'RESET_PAYMENT_TOKEN' }],
      };

    default:
      return NO_CHANGE(current);
  }
}

function transitionFromDepositing(
  current: BuyOrderMachineState,
  event: BuyOrderEvent,
): TransitionResult {
  switch (event.type) {
    case 'DEPOSIT_CONFIRMED': {
      if (current.transactionId !== event.transactionId) {
        return NO_CHANGE(current);
      }
      return {
        nextState: {
          ...current,
          state: BuyOrderState.PLACING_ORDER,
        },
        effects: [
          { type: 'CLEAR_PENDING_ORDER', transactionId: event.transactionId },
          { type: 'PLACE_ORDER' },
        ],
      };
    }

    case 'DEPOSIT_FAILED': {
      if (current.transactionId !== event.transactionId) {
        return NO_CHANGE(current);
      }
      return {
        nextState: {
          state: BuyOrderState.PAY_WITH_ANY_TOKEN,
          error: event.error,
          transactionId: undefined,
        },
        effects: [
          { type: 'CLEAR_PENDING_ORDER', transactionId: event.transactionId },
          { type: 'CLEAR_OPTIMISTIC_POSITION' },
          { type: 'INIT_PAY_WITH_ANY_TOKEN' },
          { type: 'LOG_ERROR', error: event.error },
        ],
      };
    }

    case 'DEPOSIT_REJECTED': {
      if (current.transactionId !== event.transactionId) {
        return NO_CHANGE(current);
      }
      return {
        nextState: {
          state: BuyOrderState.PREVIEW,
          transactionId: undefined,
        },
        effects: [
          { type: 'CLEAR_PENDING_ORDER', transactionId: event.transactionId },
          { type: 'RESET_PAYMENT_TOKEN' },
        ],
      };
    }

    case 'CLEANUP':
      return {
        nextState: null,
        effects: [{ type: 'REJECT_APPROVAL' }, { type: 'RESET_PAYMENT_TOKEN' }],
      };

    default:
      return NO_CHANGE(current);
  }
}

function transitionFromPlacingOrder(
  current: BuyOrderMachineState,
  event: BuyOrderEvent,
): TransitionResult {
  switch (event.type) {
    case 'ORDER_SUCCEEDED':
      return {
        nextState: { ...current, state: BuyOrderState.SUCCESS },
        effects: [
          { type: 'TRACK_ANALYTICS', status: 'succeeded' },
          { type: 'PUBLISH_ORDER_CONFIRMED' },
          { type: 'INVALIDATE_QUERY_CACHE' },
          { type: 'SHOW_TOAST', variant: 'order_placed' },
          { type: 'NAVIGATE_POP' },
        ],
      };

    case 'ORDER_FAILED': {
      const hadTransaction = !!current.transactionId;
      const effects: BuyOrderEffect[] = [
        { type: 'TRACK_ANALYTICS', status: 'failed' },
        { type: 'CLEAR_OPTIMISTIC_POSITION' },
        { type: 'RESET_PAYMENT_TOKEN' },
        { type: 'LOG_ERROR', error: event.error },
      ];

      if (hadTransaction) {
        effects.push({ type: 'PUBLISH_ORDER_FAILED' });
        effects.push({ type: 'INIT_PAY_WITH_ANY_TOKEN' });
      }

      return {
        nextState: {
          state: BuyOrderState.PREVIEW,
          error: event.error,
          transactionId: undefined,
        },
        effects,
      };
    }

    case 'CLEANUP':
      return {
        nextState: null,
        effects: [{ type: 'REJECT_APPROVAL' }, { type: 'RESET_PAYMENT_TOKEN' }],
      };

    default:
      return NO_CHANGE(current);
  }
}

function transitionFromSuccess(
  current: BuyOrderMachineState,
  event: BuyOrderEvent,
): TransitionResult {
  if (event.type === 'CLEANUP') {
    return {
      nextState: null,
      effects: [{ type: 'REJECT_APPROVAL' }, { type: 'RESET_PAYMENT_TOKEN' }],
    };
  }
  return NO_CHANGE(current);
}

export function transition(
  current: BuyOrderMachineState | null,
  event: BuyOrderEvent,
): TransitionResult {
  if (!current) {
    return NO_CHANGE(current);
  }

  switch (current.state) {
    case BuyOrderState.PREVIEW:
      return transitionFromPreview(current, event);
    case BuyOrderState.PAY_WITH_ANY_TOKEN:
      return transitionFromPayWithAnyToken(current, event);
    case BuyOrderState.DEPOSITING:
      return transitionFromDepositing(current, event);
    case BuyOrderState.PLACING_ORDER:
      return transitionFromPlacingOrder(current, event);
    case BuyOrderState.SUCCESS:
      return transitionFromSuccess(current, event);
    default:
      return NO_CHANGE(current);
  }
}
