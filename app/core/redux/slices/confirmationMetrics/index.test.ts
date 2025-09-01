import reducer, {
  initialState,
  updateConfirmationMetric,
  selectConfirmationMetrics,
  ConfirmationMetrics,
  selectConfirmationMetricsById,
  setTransactionPayToken,
  TransactionPayToken,
  selectTransactionPayToken,
  setTransactionBridgeQuotes,
  selectTransactionBridgeQuotesById,
  selectIsTransactionBridgeQuotesLoadingById,
  setTransactionBridgeQuotesLoading,
} from './index';
import { RootState } from '../../../../reducers';
import { TransactionBridgeQuote } from '../../../../components/Views/confirmations/utils/bridge';

const ID_MOCK = '123-456';

const PAY_TOKEN_MOCK: TransactionPayToken = {
  address: '0x456',
  chainId: '0x123',
};

const QUOTE_MOCK = {
  quote: {
    srcChainId: '0x1',
  },
} as unknown as TransactionBridgeQuote;

describe('confirmationMetrics slice', () => {
  describe('updateConfirmationMetric', () => {
    it('adds new metric', () => {
      const params: ConfirmationMetrics = {
        properties: { testProp: 'value' },
        sensitiveProperties: { sensitiveProp: 'secret' },
      };

      const action = updateConfirmationMetric({ id: ID_MOCK, params });
      const state = reducer(initialState, action);

      expect(state.metricsById[ID_MOCK]).toEqual(params);
    });

    it('updates existing metric', () => {
      const initialParams: ConfirmationMetrics = {
        properties: { existingProp: 'value' },
        sensitiveProperties: { existingSensitive: 'secret' },
      };

      const existingState = {
        ...initialState,
        metricsById: {
          [ID_MOCK]: initialParams,
        },
      };

      const newParams: ConfirmationMetrics = {
        properties: { newProp: 'new-value' },
        sensitiveProperties: { newSensitive: 'new-secret' },
      };

      const action = updateConfirmationMetric({
        id: ID_MOCK,
        params: newParams,
      });
      const state = reducer(existingState, action);

      expect(state.metricsById[ID_MOCK]).toEqual({
        properties: {
          existingProp: 'value',
          newProp: 'new-value',
        },
        sensitiveProperties: {
          existingSensitive: 'secret',
          newSensitive: 'new-secret',
        },
      });
    });

    it('initializes empty properties when not provided', () => {
      const params: ConfirmationMetrics = {}; // Empty params

      const action = updateConfirmationMetric({ id: ID_MOCK, params });
      const state = reducer(initialState, action);

      expect(state.metricsById[ID_MOCK]).toEqual({
        properties: {},
        sensitiveProperties: {},
      });
    });
  });

  describe('selectConfirmationMetrics', () => {
    it('returns confirmation metrics', () => {
      const metricsById = {
        'id-1': {
          properties: { prop1: 'value1' },
          sensitiveProperties: { sensitive1: 'secret1' },
        },
        'id-2': {
          properties: { prop2: 'value2' },
          sensitiveProperties: { sensitive2: 'secret2' },
        },
      };

      const state = {
        confirmationMetrics: { metricsById },
      } as unknown as RootState;

      expect(selectConfirmationMetrics(state)).toEqual(metricsById);
    });
  });

  describe('selectConfirmationMetricsById', () => {
    it('returns confirmation metrics by ID', () => {
      const metricsById = {
        [ID_MOCK]: {
          properties: { prop1: 'value1' },
          sensitiveProperties: { sensitive: 'secret' },
        },
        'id-2': {
          properties: { prop2: 'value2' },
          sensitiveProperties: { sensitive2: 'secret2' },
        },
      };

      const state = {
        confirmationMetrics: { metricsById },
      } as unknown as RootState;

      expect(selectConfirmationMetricsById(state, ID_MOCK)).toEqual(
        metricsById[ID_MOCK],
      );
    });
  });

  describe('setTransactionPayToken', () => {
    it('updates transaction pay token for ID', () => {
      const action = setTransactionPayToken({
        transactionId: ID_MOCK,
        payToken: PAY_TOKEN_MOCK,
      });

      const state = reducer(initialState, action);

      expect(state.transactionPayTokenById[ID_MOCK]).toEqual(PAY_TOKEN_MOCK);
    });
  });

  describe('selectTransactionPayToken', () => {
    it('returns transaction pay token', () => {
      const state = {
        confirmationMetrics: {
          transactionPayTokenById: { [ID_MOCK]: PAY_TOKEN_MOCK },
        },
      } as unknown as RootState;

      expect(selectTransactionPayToken(state, ID_MOCK)).toEqual(PAY_TOKEN_MOCK);
    });
  });

  describe('setTransactionBridgeQuotes', () => {
    it('updates transaction bridge quotes for ID', () => {
      const action = setTransactionBridgeQuotes({
        transactionId: ID_MOCK,
        quotes: [QUOTE_MOCK],
      });

      const state = reducer(initialState, action);

      expect(state.transactionBridgeQuotesById[ID_MOCK]).toStrictEqual([
        QUOTE_MOCK,
      ]);
    });
  });

  describe('selectTransactionBridgeQuotesById', () => {
    it('returns transaction bridge quotes by ID', () => {
      const state = {
        confirmationMetrics: {
          transactionBridgeQuotesById: { [ID_MOCK]: [QUOTE_MOCK] },
        },
      } as unknown as RootState;

      expect(selectTransactionBridgeQuotesById(state, ID_MOCK)).toStrictEqual([
        QUOTE_MOCK,
      ]);
    });
  });

  describe('selectTransactionBridgeQuotesLoadingById', () => {
    it('returns true if set as loading in state', () => {
      const state = {
        confirmationMetrics: {
          isTransactionBridgeQuotesLoadingById: { [ID_MOCK]: true },
        },
      } as unknown as RootState;

      expect(selectIsTransactionBridgeQuotesLoadingById(state, ID_MOCK)).toBe(
        true,
      );
    });

    it('returns false if not in state', () => {
      const state = {
        confirmationMetrics: {
          isTransactionBridgeQuotesLoadingById: {},
        },
      } as unknown as RootState;

      expect(selectIsTransactionBridgeQuotesLoadingById(state, ID_MOCK)).toBe(
        false,
      );
    });
  });

  describe('setTransactionBridgeQuotesLoading', () => {
    it('updates loading state for ID', () => {
      const action = setTransactionBridgeQuotesLoading({
        transactionId: ID_MOCK,
        isLoading: true,
      });

      const state = reducer(initialState, action);

      expect(state.isTransactionBridgeQuotesLoadingById[ID_MOCK]).toBe(true);
    });
  });
});
