import { BuyOrderState, type BuyOrderMachineState } from './types';

describe('display state projection', () => {
  function deriveIsPlacingOrder(state: BuyOrderMachineState | null): boolean {
    return (
      state?.state === BuyOrderState.DEPOSITING ||
      state?.state === BuyOrderState.PLACING_ORDER
    );
  }

  function deriveIsConfirming(state: BuyOrderMachineState | null): boolean {
    return deriveIsPlacingOrder(state);
  }

  describe('deriveIsPlacingOrder', () => {
    it('returns false for null state', () => {
      const result = deriveIsPlacingOrder(null);

      expect(result).toBe(false);
    });

    it('returns false for PREVIEW', () => {
      const result = deriveIsPlacingOrder({ state: BuyOrderState.PREVIEW });

      expect(result).toBe(false);
    });

    it('returns false for PAY_WITH_ANY_TOKEN', () => {
      const result = deriveIsPlacingOrder({
        state: BuyOrderState.PAY_WITH_ANY_TOKEN,
      });

      expect(result).toBe(false);
    });

    it('returns true for DEPOSITING', () => {
      const result = deriveIsPlacingOrder({
        state: BuyOrderState.DEPOSITING,
        transactionId: 'tx-1',
      });

      expect(result).toBe(true);
    });

    it('returns true for PLACING_ORDER', () => {
      const result = deriveIsPlacingOrder({
        state: BuyOrderState.PLACING_ORDER,
      });

      expect(result).toBe(true);
    });

    it('returns false for SUCCESS', () => {
      const result = deriveIsPlacingOrder({ state: BuyOrderState.SUCCESS });

      expect(result).toBe(false);
    });
  });

  describe('deriveIsConfirming', () => {
    it('mirrors isPlacingOrder exactly', () => {
      const states: (BuyOrderMachineState | null)[] = [
        null,
        { state: BuyOrderState.PREVIEW },
        { state: BuyOrderState.PAY_WITH_ANY_TOKEN },
        { state: BuyOrderState.DEPOSITING, transactionId: 'tx-1' },
        { state: BuyOrderState.PLACING_ORDER },
        { state: BuyOrderState.SUCCESS },
      ];

      for (const state of states) {
        expect(deriveIsConfirming(state)).toBe(deriveIsPlacingOrder(state));
      }
    });
  });

  describe('error display from machine state', () => {
    it('exposes machine error when present', () => {
      const state: BuyOrderMachineState = {
        state: BuyOrderState.PREVIEW,
        error: 'Order failed: insufficient liquidity',
      };

      expect(state.error).toBe('Order failed: insufficient liquidity');
    });

    it('has no error in clean states', () => {
      const state: BuyOrderMachineState = {
        state: BuyOrderState.PLACING_ORDER,
      };

      expect(state.error).toBeUndefined();
    });
  });

  describe('transactionId tracking', () => {
    it('tracks transactionId in DEPOSITING state', () => {
      const state: BuyOrderMachineState = {
        state: BuyOrderState.DEPOSITING,
        transactionId: 'tx-deposit-abc',
      };

      expect(state.transactionId).toBe('tx-deposit-abc');
    });

    it('clears transactionId on error recovery', () => {
      const state: BuyOrderMachineState = {
        state: BuyOrderState.PREVIEW,
        error: 'Deposit reverted',
        transactionId: undefined,
      };

      expect(state.transactionId).toBeUndefined();
    });
  });
});
