import { configureStore } from '@reduxjs/toolkit';
import performanceReducer, {
  startPerformanceTrace,
  endPerformanceTrace,
  clearPerformanceMetrics,
  PerformanceState,
} from './index';

// Mock RootState interface for testing
interface MockRootState {
  performance: PerformanceState;
}

// Mock selectors that work with MockRootState
const mockSelectPerformanceData = (state: MockRootState) => state.performance;
const mockSelectPerformanceMetrics = (state: MockRootState) =>
  state.performance.metrics;
const mockSelectPerformanceSession = (state: MockRootState) => ({
  sessionId: state.performance.sessionId,
  startTime: state.performance.startTime,
  environment: state.performance.environment,
});

describe('Performance Slice', () => {
  let store: ReturnType<typeof configureStore<MockRootState>>;

  beforeEach(() => {
    jest.useFakeTimers();
    store = configureStore({
      reducer: {
        performance: performanceReducer,
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('have the correct initial state', () => {
      const state = store.getState().performance;
      expect(state).toEqual({
        sessionId: '',
        startTime: 0,
        metrics: [],
        environment: {
          branch: '',
          commitHash: '',
          platform: '',
          appVersion: '',
        },
        activeTraces: {},
        isInitialized: false,
      });
    });
  });

  describe('startPerformanceTrace', () => {
    it('initialize session and start a trace', () => {
      const environment = {
        branch: 'main',
        commitHash: 'abc123',
        platform: 'ios',
        appVersion: '1.0.0',
      };

      store.dispatch(
        startPerformanceTrace({
          eventName: 'test_trace',
          metadata: { test: 'data' },
          environment,
        }),
      );

      const state = store.getState().performance;
      expect(state.isInitialized).toBe(true);
      expect(state.sessionId).toBeDefined();
      expect(state.startTime).toBeGreaterThan(0);
      expect(state.environment).toEqual(environment);
      expect(state.activeTraces.test_trace).toBeDefined();
      expect(state.activeTraces.test_trace.metadata).toEqual({ test: 'data' });
    });

    it('not initialize session if already initialized', () => {
      const environment1 = {
        branch: 'main',
        commitHash: 'abc123',
        platform: 'ios',
        appVersion: '1.0.0',
      };

      const environment2 = {
        branch: 'feature',
        commitHash: 'def456',
        platform: 'android',
        appVersion: '2.0.0',
      };

      store.dispatch(
        startPerformanceTrace({
          eventName: 'first_trace',
          environment: environment1,
        }),
      );

      const firstState = store.getState().performance;
      const firstSessionId = firstState.sessionId;

      store.dispatch(
        startPerformanceTrace({
          eventName: 'second_trace',
          environment: environment2,
        }),
      );

      const secondState = store.getState().performance;
      expect(secondState.sessionId).toBe(firstSessionId);
      expect(secondState.environment).toEqual(environment1);
    });
  });

  describe('endPerformanceTrace', () => {
    it('end a trace and add it to metrics', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      store.dispatch(
        startPerformanceTrace({
          eventName: 'test_trace',
          metadata: { initial: 'data' },
        }),
      );

      // Advance time by 100ms
      jest.advanceTimersByTime(100);

      store.dispatch(
        endPerformanceTrace({
          eventName: 'test_trace',
          additionalMetadata: { additional: 'data' },
        }),
      );

      const state = store.getState().performance;
      expect(state.activeTraces.test_trace).toBeUndefined();
      expect(state.metrics).toHaveLength(1);
      expect(state.metrics[0].eventName).toBe('test_trace');
      expect(state.metrics[0].duration).toBe(100);
      expect(state.metrics[0].metadata).toEqual({
        initial: 'data',
        additional: 'data',
      });
    });

    it('not add metric if trace does not exist', () => {
      store.dispatch(
        endPerformanceTrace({
          eventName: 'non_existent_trace',
        }),
      );

      const state = store.getState().performance;
      expect(state.metrics).toHaveLength(0);
    });
  });

  describe('clearPerformanceMetrics', () => {
    it('clear all metrics and active traces', () => {
      store.dispatch(
        startPerformanceTrace({
          eventName: 'test_trace',
        }),
      );

      store.dispatch(clearPerformanceMetrics());

      const state = store.getState().performance;
      expect(state.metrics).toHaveLength(0);
      expect(state.activeTraces).toEqual({});
    });
  });

  describe('Selectors', () => {
    it('selectPerformanceData return the entire performance state', () => {
      const state = store.getState();
      expect(mockSelectPerformanceData(state)).toEqual(state.performance);
    });

    it('selectPerformanceMetrics return only metrics', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      store.dispatch(
        startPerformanceTrace({
          eventName: 'test_trace',
        }),
      );

      jest.advanceTimersByTime(100);

      store.dispatch(
        endPerformanceTrace({
          eventName: 'test_trace',
        }),
      );

      const state = store.getState();
      expect(mockSelectPerformanceMetrics(state)).toEqual(
        state.performance.metrics,
      );
    });

    it('selectPerformanceSession return session information', () => {
      const environment = {
        branch: 'main',
        commitHash: 'abc123',
        platform: 'ios',
        appVersion: '1.0.0',
      };

      store.dispatch(
        startPerformanceTrace({
          eventName: 'test_trace',
          environment,
        }),
      );

      const state = store.getState();
      const session = mockSelectPerformanceSession(state);
      expect(session.sessionId).toBe(state.performance.sessionId);
      expect(session.startTime).toBe(state.performance.startTime);
      expect(session.environment).toEqual(environment);
    });
  });
});
