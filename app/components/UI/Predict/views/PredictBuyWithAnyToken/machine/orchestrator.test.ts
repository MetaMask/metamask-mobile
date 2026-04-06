import { createBuyOrderOrchestrator } from './orchestrator';
import { BuyOrderState } from './types';
import type { BuyOrderPorts } from './ports';
import {
  createTestNavigationAdapter,
  createTestTransactionMonitorAdapter,
  createTestApprovalAdapter,
  createTestOrderExecutionAdapter,
} from './testing';

function createTestPorts() {
  const navigation = createTestNavigationAdapter();
  const transactionMonitor = createTestTransactionMonitorAdapter();
  const approval = createTestApprovalAdapter('tx-approval-1');
  const orderExecution = createTestOrderExecutionAdapter();
  const toast = { showOrderPlaced: jest.fn(), showDepositFailed: jest.fn() };
  const analytics = { trackOrderEvent: jest.fn() };
  const queryCache = { invalidate: jest.fn() };

  const resetPaymentToken = jest.fn();
  const logError = jest.fn();

  const ports: BuyOrderPorts = {
    navigation,
    transactionMonitor,
    approval,
    orderExecution,
    toast,
    analytics,
    queryCache,
    resetPaymentToken,
    logError,
  };

  return {
    ports,
    navigation,
    transactionMonitor,
    approval,
    orderExecution,
    toast,
    analytics,
    queryCache,
    resetPaymentToken,
    logError,
  };
}

describe('createBuyOrderOrchestrator', () => {
  it('starts in PREVIEW state', () => {
    const { ports } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.PREVIEW);
  });

  it('transitions to PLACING_ORDER on CONFIRM_BALANCE_PATH and resolves to SUCCESS', async () => {
    const { ports, analytics, toast, queryCache } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);

    orchestrator.send({ type: 'CONFIRM_BALANCE_PATH' });

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.PLACING_ORDER);
    expect(analytics.trackOrderEvent).toHaveBeenCalledWith('submitted');

    await Promise.resolve();

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.SUCCESS);
    expect(toast.showOrderPlaced).toHaveBeenCalledTimes(1);
    expect(queryCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('transitions through full any-token flow on deposit confirmed', async () => {
    const {
      ports,
      navigation,
      transactionMonitor,
      approval,
      toast,
      queryCache,
    } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.send({ type: 'SELECT_PAYMENT_TOKEN', isBalanceToken: false });
    orchestrator.send({
      type: 'CONFIRM_ANY_TOKEN_PATH',
      transactionId: 'tx-dep-1',
    });

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.DEPOSITING);
    expect(approval.confirmCallCount).toBe(1);

    transactionMonitor.simulateConfirmed('tx-dep-1');

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.PLACING_ORDER);

    await Promise.resolve();

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.SUCCESS);
    expect(navigation.popCallCount).toBe(1);
    expect(toast.showOrderPlaced).toHaveBeenCalledTimes(1);
    expect(queryCache.invalidate).toHaveBeenCalledTimes(1);

    orchestrator.destroy();
  });

  it('recovers from deposit failure with retry', () => {
    const { ports, transactionMonitor, orderExecution } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.send({ type: 'SELECT_PAYMENT_TOKEN', isBalanceToken: false });
    orchestrator.send({
      type: 'CONFIRM_ANY_TOKEN_PATH',
      transactionId: 'tx-dep-2',
    });

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.DEPOSITING);

    transactionMonitor.simulateFailed('tx-dep-2', 'Reverted');

    expect(orchestrator.getState()?.state).toBe(
      BuyOrderState.PAY_WITH_ANY_TOKEN,
    );
    expect(orchestrator.getState()?.error).toBe('Reverted');
    expect(orderExecution.initPayWithAnyTokenCallCount).toBe(1);

    orchestrator.destroy();
  });

  it('cleans up state on navigation beforeRemove', () => {
    const { ports, navigation, approval } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.send({ type: 'SELECT_PAYMENT_TOKEN', isBalanceToken: false });

    expect(orchestrator.getState()?.state).toBe(
      BuyOrderState.PAY_WITH_ANY_TOKEN,
    );

    navigation.triggerBeforeRemove();

    expect(orchestrator.getState()).toBeNull();
    expect(approval.rejectCallCount).toBe(1);

    orchestrator.destroy();
  });

  it('ignores stale deposit events after destroy', () => {
    const { ports, transactionMonitor } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.send({ type: 'SELECT_PAYMENT_TOKEN', isBalanceToken: false });
    orchestrator.send({
      type: 'CONFIRM_ANY_TOKEN_PATH',
      transactionId: 'tx-dep-3',
    });

    orchestrator.destroy();

    transactionMonitor.simulateConfirmed('tx-dep-3');

    expect(orchestrator.getState()).toBeNull();
  });

  it('isolates effect execution failures', () => {
    const { ports, analytics } = createTestPorts();
    analytics.trackOrderEvent.mockImplementation(() => {
      throw new Error('analytics crashed');
    });

    const orchestrator = createBuyOrderOrchestrator(ports);

    orchestrator.send({ type: 'CONFIRM_BALANCE_PATH' });

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.PLACING_ORDER);
  });

  it('handles deposit rejected with payment token reset', () => {
    const { ports, transactionMonitor, approval } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.send({ type: 'SELECT_PAYMENT_TOKEN', isBalanceToken: false });
    orchestrator.send({
      type: 'CONFIRM_ANY_TOKEN_PATH',
      transactionId: 'tx-dep-4',
    });

    transactionMonitor.simulateRejected('tx-dep-4');

    expect(orchestrator.getState()?.state).toBe(BuyOrderState.PREVIEW);
    expect(orchestrator.getState()?.transactionId).toBeUndefined();

    orchestrator.destroy();
  });

  it('unsubscribes listeners on destroy', () => {
    const { ports, navigation, transactionMonitor } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);
    orchestrator.start();

    orchestrator.destroy();

    navigation.triggerBeforeRemove();
    transactionMonitor.simulateConfirmed('anything');

    expect(orchestrator.getState()).toBeNull();
  });

  it('returns cleanup function from start', () => {
    const { ports, navigation } = createTestPorts();
    const orchestrator = createBuyOrderOrchestrator(ports);

    const cleanup = orchestrator.start();
    cleanup();

    navigation.triggerBeforeRemove();

    expect(orchestrator.getState()).toBeNull();
  });
});
