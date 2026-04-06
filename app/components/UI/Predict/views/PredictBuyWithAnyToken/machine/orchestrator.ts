import { transition } from './transition';
import {
  BuyOrderState,
  BuyOrderMachineState,
  BuyOrderEvent,
  BuyOrderEffect,
} from './types';
import type { BuyOrderPorts } from './ports';

export interface BuyOrderOrchestrator {
  getState(): BuyOrderMachineState | null;
  send(event: BuyOrderEvent): void;
  start(): () => void;
  destroy(): void;
}

export interface OrchestratorOptions {
  onStateChange?: (state: BuyOrderMachineState | null) => void;
}

export function createBuyOrderOrchestrator(
  ports: BuyOrderPorts,
  options?: OrchestratorOptions,
): BuyOrderOrchestrator {
  let currentState: BuyOrderMachineState | null = {
    state: BuyOrderState.PREVIEW,
  };
  let cleanupFns: (() => void)[] = [];

  function executeEffect(effect: BuyOrderEffect): void {
    try {
      switch (effect.type) {
        case 'TRACK_ANALYTICS':
          ports.analytics.trackOrderEvent(effect.status);
          break;
        case 'PLACE_ORDER':
          ports.orderExecution
            .placeOrder()
            .then((result) => {
              if (result.success) {
                send({
                  type: 'ORDER_SUCCEEDED',
                  spentAmount: result.response.spentAmount,
                  receivedAmount: result.response.receivedAmount,
                });
              } else {
                send({
                  type: 'ORDER_FAILED',
                  error: result.error ?? 'Order failed',
                });
              }
            })
            .catch((err) => {
              send({
                type: 'ORDER_FAILED',
                error: err instanceof Error ? err.message : 'Order failed',
              });
            });
          break;
        case 'SHOW_TOAST':
          if (effect.variant === 'order_placed') {
            ports.toast.showOrderPlaced();
          } else {
            ports.toast.showDepositFailed(effect.message ?? '');
          }
          break;
        case 'INVALIDATE_QUERY_CACHE':
          ports.queryCache.invalidate();
          break;
        case 'NAVIGATE_POP':
          ports.navigation.pop();
          break;
        case 'INIT_PAY_WITH_ANY_TOKEN':
          ports.orderExecution.initPayWithAnyToken();
          break;
        case 'CONFIRM_APPROVAL':
          ports.approval.confirmApproval();
          break;
        case 'REJECT_APPROVAL':
          ports.approval.rejectApproval();
          break;
        case 'RESET_PAYMENT_TOKEN':
          ports.resetPaymentToken();
          break;
        case 'LOG_ERROR':
          ports.logError(effect.error);
          break;
        case 'STORE_PENDING_ORDER':
        case 'CLEAR_PENDING_ORDER':
        case 'CLEAR_OPTIMISTIC_POSITION':
        case 'PUBLISH_ORDER_CONFIRMED':
        case 'PUBLISH_ORDER_FAILED':
        case 'PUBLISH_DEPOSIT_FAILED':
          break;
      }
    } catch (_e) {
      // Effect isolation: one failing effect must not block others
    }
  }

  function send(event: BuyOrderEvent): void {
    const result = transition(currentState, event);
    currentState = result.nextState;
    options?.onStateChange?.(currentState);

    for (const effect of result.effects) {
      executeEffect(effect);
    }
  }

  function handleDepositStatus(
    event:
      | { status: 'confirmed'; transactionId: string }
      | { status: 'failed'; transactionId: string; error: string }
      | { status: 'rejected'; transactionId: string },
  ): void {
    switch (event.status) {
      case 'confirmed':
        send({
          type: 'DEPOSIT_CONFIRMED',
          transactionId: event.transactionId,
        });
        break;
      case 'failed':
        send({
          type: 'DEPOSIT_FAILED',
          transactionId: event.transactionId,
          error: event.error,
        });
        break;
      case 'rejected':
        send({
          type: 'DEPOSIT_REJECTED',
          transactionId: event.transactionId,
        });
        break;
    }
  }

  function start(): () => void {
    const unsubDeposit =
      ports.transactionMonitor.onDepositStatusChange(handleDepositStatus);
    cleanupFns.push(unsubDeposit);

    const unsubBeforeRemove = ports.navigation.onBeforeRemove(() => {
      send({ type: 'CLEANUP' });
    });
    cleanupFns.push(unsubBeforeRemove);

    return () => destroy();
  }

  function destroy(): void {
    for (const fn of cleanupFns) {
      fn();
    }
    cleanupFns = [];
    currentState = null;
    options?.onStateChange?.(null);
  }

  return { getState, send, start, destroy };

  function getState(): BuyOrderMachineState | null {
    return currentState;
  }
}
