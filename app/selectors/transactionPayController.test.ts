import { RootState } from '../reducers';
import {
  selectTransactionDataByTransactionId,
  selectTransactionPayTotalsByTransactionId,
  selectIsTransactionPayLoadingByTransactionId,
  selectTransactionPayQuotesByTransactionId,
  selectTransactionPayTokensByTransactionId,
  selectTransactionPaymentTokenByTransactionId,
  selectTransactionPaySourceAmountsByTransactionId,
  selectTransactionPayIsMaxAmountByTransactionId,
  selectTransactionPayIsPostQuoteByTransactionId,
  selectTransactionPayFiatPaymentByTransactionId,
  selectTransactionPayTransactionData,
  selectAccountOverrideByTransactionId,
} from './transactionPayController';

const TRANSACTION_ID_MOCK = 'tx-1';

function createMockRootState(
  transactionData: Record<string, Record<string, unknown>> = {},
): RootState {
  return {
    engine: {
      backgroundState: {
        TransactionPayController: {
          transactionData,
        },
      },
    },
  } as unknown as RootState;
}

describe('transactionPayController selectors', () => {
  describe('selectTransactionDataByTransactionId', () => {
    it('returns transaction data for a given transaction ID', () => {
      const txData = { totals: { fiat: '100' } };
      const state = createMockRootState({ [TRANSACTION_ID_MOCK]: txData });

      const result = selectTransactionDataByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(txData);
    });

    it('returns undefined when transaction ID does not exist', () => {
      const state = createMockRootState({});

      const result = selectTransactionDataByTransactionId(state, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('returns empty transactionData when TransactionPayController is missing', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;

      const result = selectTransactionDataByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectTransactionPayTotalsByTransactionId', () => {
    it('returns totals from transaction data', () => {
      const totals = { fiat: '100', token: '50' };
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { totals },
      });

      const result = selectTransactionPayTotalsByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(totals);
    });

    it('returns undefined when transaction data has no totals', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectTransactionPayTotalsByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectIsTransactionPayLoadingByTransactionId', () => {
    it('returns true when isLoading is true', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { isLoading: true },
      });

      const result = selectIsTransactionPayLoadingByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(true);
    });

    it('returns false when isLoading is not set', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectIsTransactionPayLoadingByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectTransactionPayQuotesByTransactionId', () => {
    it('returns quotes from transaction data', () => {
      const quotes = [{ id: 'q1' }];
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { quotes },
      });

      const result = selectTransactionPayQuotesByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(quotes);
    });
  });

  describe('selectTransactionPayTokensByTransactionId', () => {
    it('returns tokens from transaction data', () => {
      const tokens = [{ address: '0x1' }];
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { tokens },
      });

      const result = selectTransactionPayTokensByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(tokens);
    });

    it('returns empty array when tokens are not set', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectTransactionPayTokensByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toEqual([]);
    });
  });

  describe('selectTransactionPaymentTokenByTransactionId', () => {
    it('returns payment token from transaction data', () => {
      const paymentToken = { address: '0xToken', chainId: '0x1' };
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { paymentToken },
      });

      const result = selectTransactionPaymentTokenByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(paymentToken);
    });
  });

  describe('selectTransactionPaySourceAmountsByTransactionId', () => {
    it('returns source amounts from transaction data', () => {
      const sourceAmounts = { token: '100' };
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { sourceAmounts },
      });

      const result = selectTransactionPaySourceAmountsByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(sourceAmounts);
    });
  });

  describe('selectTransactionPayIsMaxAmountByTransactionId', () => {
    it('returns true when isMaxAmount is true', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { isMaxAmount: true },
      });

      const result = selectTransactionPayIsMaxAmountByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(true);
    });

    it('returns false when isMaxAmount is not set', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectTransactionPayIsMaxAmountByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectTransactionPayIsPostQuoteByTransactionId', () => {
    it('returns true when isPostQuote is true', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { isPostQuote: true },
      });

      const result = selectTransactionPayIsPostQuoteByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(true);
    });

    it('returns false when isPostQuote is not set', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectTransactionPayIsPostQuoteByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectTransactionPayFiatPaymentByTransactionId', () => {
    it('returns fiat payment from transaction data', () => {
      const fiatPayment = { method: 'card', amount: '50' };
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { fiatPayment },
      });

      const result = selectTransactionPayFiatPaymentByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe(fiatPayment);
    });
  });

  describe('selectTransactionPayTransactionData', () => {
    it('returns the full transactionData object', () => {
      const transactionData = {
        'tx-1': { totals: {} },
        'tx-2': { totals: {} },
      };
      const state = createMockRootState(transactionData);

      const result = selectTransactionPayTransactionData(state);

      expect(result).toBe(transactionData);
    });
  });

  describe('selectAccountOverrideByTransactionId', () => {
    it('returns accountOverride from transaction data', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: { accountOverride: '0xOverrideAddress' },
      });

      const result = selectAccountOverrideByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBe('0xOverrideAddress');
    });

    it('returns undefined when accountOverride is not set', () => {
      const state = createMockRootState({
        [TRANSACTION_ID_MOCK]: {},
      });

      const result = selectAccountOverrideByTransactionId(
        state,
        TRANSACTION_ID_MOCK,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when transaction ID does not exist', () => {
      const state = createMockRootState({});

      const result = selectAccountOverrideByTransactionId(state, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
