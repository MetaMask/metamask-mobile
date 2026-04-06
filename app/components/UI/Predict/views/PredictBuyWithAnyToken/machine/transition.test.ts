import { transition } from './transition';
import { BuyOrderState, BuyOrderMachineState, BuyOrderEvent } from './types';

const preview = (
  overrides?: Partial<BuyOrderMachineState>,
): BuyOrderMachineState => ({
  state: BuyOrderState.PREVIEW,
  ...overrides,
});

const payWithAnyToken = (
  overrides?: Partial<BuyOrderMachineState>,
): BuyOrderMachineState => ({
  state: BuyOrderState.PAY_WITH_ANY_TOKEN,
  ...overrides,
});

const depositing = (
  transactionId: string,
  overrides?: Partial<BuyOrderMachineState>,
): BuyOrderMachineState => ({
  state: BuyOrderState.DEPOSITING,
  transactionId,
  ...overrides,
});

const placingOrder = (
  overrides?: Partial<BuyOrderMachineState>,
): BuyOrderMachineState => ({
  state: BuyOrderState.PLACING_ORDER,
  ...overrides,
});

const success = (
  overrides?: Partial<BuyOrderMachineState>,
): BuyOrderMachineState => ({
  state: BuyOrderState.SUCCESS,
  ...overrides,
});

describe('transition', () => {
  describe('null state', () => {
    it('returns no change for any event', () => {
      const result = transition(null, { type: 'CONFIRM_BALANCE_PATH' });

      expect(result.nextState).toBeNull();
      expect(result.effects).toEqual([]);
    });
  });

  describe('PREVIEW', () => {
    it('CONFIRM_BALANCE_PATH → PLACING_ORDER with PLACE_ORDER + analytics', () => {
      const result = transition(preview(), { type: 'CONFIRM_BALANCE_PATH' });

      expect(result.nextState?.state).toBe(BuyOrderState.PLACING_ORDER);
      expect(result.effects).toEqual([
        { type: 'TRACK_ANALYTICS', status: 'submitted' },
        { type: 'PLACE_ORDER' },
      ]);
    });

    it('SELECT_PAYMENT_TOKEN (external) → PAY_WITH_ANY_TOKEN', () => {
      const result = transition(preview(), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: false,
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PAY_WITH_ANY_TOKEN);
      expect(result.nextState?.error).toBeUndefined();
      expect(result.effects).toEqual([]);
    });

    it('SELECT_PAYMENT_TOKEN (balance) → no change', () => {
      const result = transition(preview(), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: true,
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.effects).toEqual([]);
    });

    it('clears error when toggling to PAY_WITH_ANY_TOKEN', () => {
      const result = transition(preview({ error: 'previous error' }), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: false,
      });

      expect(result.nextState?.error).toBeUndefined();
    });

    it('ignores unrelated events', () => {
      const result = transition(preview(), {
        type: 'ORDER_SUCCEEDED',
        spentAmount: '10',
        receivedAmount: '20',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.effects).toEqual([]);
    });
  });

  describe('PAY_WITH_ANY_TOKEN', () => {
    it('CONFIRM_ANY_TOKEN_PATH → DEPOSITING with approval + store + analytics', () => {
      const result = transition(payWithAnyToken(), {
        type: 'CONFIRM_ANY_TOKEN_PATH',
        transactionId: 'tx-123',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.DEPOSITING);
      expect(result.nextState?.transactionId).toBe('tx-123');
      expect(result.effects).toEqual([
        { type: 'CONFIRM_APPROVAL' },
        { type: 'STORE_PENDING_ORDER', transactionId: 'tx-123' },
        { type: 'TRACK_ANALYTICS', status: 'submitted' },
      ]);
    });

    it('SELECT_PAYMENT_TOKEN (balance) → PREVIEW with RESET_PAYMENT_TOKEN', () => {
      const result = transition(payWithAnyToken(), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: true,
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.effects).toEqual([{ type: 'RESET_PAYMENT_TOKEN' }]);
    });

    it('SELECT_PAYMENT_TOKEN (external) → no change', () => {
      const result = transition(payWithAnyToken(), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: false,
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PAY_WITH_ANY_TOKEN);
      expect(result.effects).toEqual([]);
    });

    it('clears error when toggling to PREVIEW', () => {
      const result = transition(payWithAnyToken({ error: 'deposit error' }), {
        type: 'SELECT_PAYMENT_TOKEN',
        isBalanceToken: true,
      });

      expect(result.nextState?.error).toBeUndefined();
    });
  });

  describe('DEPOSITING', () => {
    it('DEPOSIT_CONFIRMED (matching txId) → PLACING_ORDER with PLACE_ORDER', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_CONFIRMED',
        transactionId: 'tx-abc',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PLACING_ORDER);
      expect(result.effects).toEqual([
        { type: 'CLEAR_PENDING_ORDER', transactionId: 'tx-abc' },
        { type: 'PLACE_ORDER' },
      ]);
    });

    it('DEPOSIT_CONFIRMED (stale txId) → no change', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_CONFIRMED',
        transactionId: 'tx-old',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.DEPOSITING);
      expect(result.nextState?.transactionId).toBe('tx-abc');
      expect(result.effects).toEqual([]);
    });

    it('DEPOSIT_FAILED (matching txId) → PAY_WITH_ANY_TOKEN with error + retry', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_FAILED',
        transactionId: 'tx-abc',
        error: 'Deposit reverted',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PAY_WITH_ANY_TOKEN);
      expect(result.nextState?.error).toBe('Deposit reverted');
      expect(result.nextState?.transactionId).toBeUndefined();
      expect(result.effects).toEqual([
        { type: 'CLEAR_PENDING_ORDER', transactionId: 'tx-abc' },
        { type: 'CLEAR_OPTIMISTIC_POSITION' },
        { type: 'INIT_PAY_WITH_ANY_TOKEN' },
        { type: 'LOG_ERROR', error: 'Deposit reverted' },
      ]);
    });

    it('DEPOSIT_FAILED (stale txId) → no change', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_FAILED',
        transactionId: 'tx-old',
        error: 'Old error',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.DEPOSITING);
      expect(result.effects).toEqual([]);
    });

    it('DEPOSIT_REJECTED (matching txId) → PREVIEW with reset', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_REJECTED',
        transactionId: 'tx-abc',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.nextState?.transactionId).toBeUndefined();
      expect(result.effects).toEqual([
        { type: 'CLEAR_PENDING_ORDER', transactionId: 'tx-abc' },
        { type: 'RESET_PAYMENT_TOKEN' },
      ]);
    });

    it('DEPOSIT_REJECTED (stale txId) → no change', () => {
      const result = transition(depositing('tx-abc'), {
        type: 'DEPOSIT_REJECTED',
        transactionId: 'tx-old',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.DEPOSITING);
      expect(result.effects).toEqual([]);
    });
  });

  describe('PLACING_ORDER', () => {
    it('ORDER_SUCCEEDED → SUCCESS with toast + pop + cache invalidation', () => {
      const result = transition(placingOrder(), {
        type: 'ORDER_SUCCEEDED',
        spentAmount: '10.00',
        receivedAmount: '20.00',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.SUCCESS);
      expect(result.effects).toEqual([
        { type: 'TRACK_ANALYTICS', status: 'succeeded' },
        { type: 'PUBLISH_ORDER_CONFIRMED' },
        { type: 'INVALIDATE_QUERY_CACHE' },
        { type: 'SHOW_TOAST', variant: 'order_placed' },
        { type: 'NAVIGATE_POP' },
      ]);
    });

    it('ORDER_FAILED (balance path, no transactionId) → PREVIEW with error', () => {
      const result = transition(placingOrder(), {
        type: 'ORDER_FAILED',
        error: 'Insufficient liquidity',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.nextState?.error).toBe('Insufficient liquidity');
      expect(result.nextState?.transactionId).toBeUndefined();
      expect(result.effects).toEqual([
        { type: 'TRACK_ANALYTICS', status: 'failed' },
        { type: 'CLEAR_OPTIMISTIC_POSITION' },
        { type: 'RESET_PAYMENT_TOKEN' },
        { type: 'LOG_ERROR', error: 'Insufficient liquidity' },
      ]);
    });

    it('ORDER_FAILED (any-token path, with transactionId) → PREVIEW with retry', () => {
      const result = transition(placingOrder({ transactionId: 'tx-dep-1' }), {
        type: 'ORDER_FAILED',
        error: 'Order rejected',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.PREVIEW);
      expect(result.nextState?.error).toBe('Order rejected');
      expect(result.effects).toContainEqual({ type: 'PUBLISH_ORDER_FAILED' });
      expect(result.effects).toContainEqual({
        type: 'INIT_PAY_WITH_ANY_TOKEN',
      });
    });
  });

  describe('SUCCESS', () => {
    it('ignores non-CLEANUP events', () => {
      const result = transition(success(), {
        type: 'ORDER_SUCCEEDED',
        spentAmount: '1',
        receivedAmount: '2',
      });

      expect(result.nextState?.state).toBe(BuyOrderState.SUCCESS);
      expect(result.effects).toEqual([]);
    });
  });

  describe('CLEANUP from any state', () => {
    const states: [string, BuyOrderMachineState][] = [
      ['PREVIEW', preview()],
      ['PAY_WITH_ANY_TOKEN', payWithAnyToken()],
      ['DEPOSITING', depositing('tx-1')],
      ['PLACING_ORDER', placingOrder()],
      ['SUCCESS', success()],
    ];

    it.each(states)(
      'CLEANUP from %s → null with REJECT_APPROVAL + RESET_PAYMENT_TOKEN',
      (_label, state) => {
        const result = transition(state, { type: 'CLEANUP' } as BuyOrderEvent);

        expect(result.nextState).toBeNull();
        expect(result.effects).toEqual([
          { type: 'REJECT_APPROVAL' },
          { type: 'RESET_PAYMENT_TOKEN' },
        ]);
      },
    );
  });
});
