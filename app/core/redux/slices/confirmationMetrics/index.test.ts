import reducer, {
  initialState,
  updateConfirmationMetric,
  selectConfirmationMetrics,
  ConfirmationMetrics,
  selectConfirmationMetricsById,
  setPayAsset,
  PayAsset,
  selectPayAsset,
} from './index';
import { RootState } from '../../../../reducers';

const ID_MOCK = '123-456';

const PAY_ASSET_MOCK: PayAsset = {
  address: '0x456',
  chainId: '0x123',
};

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

  describe('setPayAsset', () => {
    it('updates pay asset for ID', () => {
      const action = setPayAsset({ id: ID_MOCK, payAsset: PAY_ASSET_MOCK });
      const state = reducer(initialState, action);

      expect(state.payAssetById[ID_MOCK]).toEqual(PAY_ASSET_MOCK);
    });
  });

  describe('selectPayAsset', () => {
    it('returns pay asset', () => {
      const state = {
        confirmationMetrics: { payAssetById: { [ID_MOCK]: PAY_ASSET_MOCK } },
      } as unknown as RootState;

      expect(selectPayAsset(state, ID_MOCK)).toEqual(PAY_ASSET_MOCK);
    });
  });
});
