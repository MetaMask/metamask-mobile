import reducer, {
  initialState,
  updateConfirmationMetric,
  selectConfirmationMetrics,
  ConfirmationMetrics,
  selectConfirmationMetricsById,
} from './index';
import { RootState } from '../../../../reducers';

describe('confirmationMetrics slice', () => {
  describe('reducer', () => {
    it('returns the initial state', () => {
      expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('handles updateConfirmationMetric for new metric', () => {
      const id = 'test-id';
      const params: ConfirmationMetrics = {
        properties: { testProp: 'value' },
        sensitiveProperties: { sensitiveProp: 'secret' },
      };

      const action = updateConfirmationMetric({ id, params });
      const state = reducer(initialState, action);

      expect(state.metricsById[id]).toEqual(params);
    });

    it('handles updateConfirmationMetric for existing metric', () => {
      const id = 'test-id';
      const initialParams: ConfirmationMetrics = {
        properties: { existingProp: 'value' },
        sensitiveProperties: { existingSensitive: 'secret' },
      };

      const existingState = {
        metricsById: {
          [id]: initialParams,
        },
      };

      const newParams: ConfirmationMetrics = {
        properties: { newProp: 'new-value' },
        sensitiveProperties: { newSensitive: 'new-secret' },
      };

      const action = updateConfirmationMetric({ id, params: newParams });
      const state = reducer(existingState, action);

      expect(state.metricsById[id]).toEqual({
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
      const id = 'test-id';
      const params: ConfirmationMetrics = {}; // Empty params

      const action = updateConfirmationMetric({ id, params });
      const state = reducer(initialState, action);

      expect(state.metricsById[id]).toEqual({
        properties: {},
        sensitiveProperties: {},
      });
    });
  });

  describe('selectors', () => {
    it('selects confirmation metrics', () => {
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

    it('selects confirmation metrics by ID', () => {
      const metricsById = {
        'id-1': {
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

      expect(selectConfirmationMetricsById(state, 'id-1')).toEqual(
        metricsById['id-1'],
      );
    });
  });
});
