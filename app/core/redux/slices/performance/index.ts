import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { isTest } from '../../../../util/test/utils';
import { createSelector } from 'reselect';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

export interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
  id?: string;
  parentId?: string;
}

export interface PerformanceState {
  sessionId: string;
  startTime: number;
  metrics: PerformanceMetric[];
  environment: {
    branch: string;
    commitHash: string;
    platform: string;
    appVersion: string;
  };
  activeTraces: Record<
    string,
    { startTime: number; metadata?: Record<string, unknown> }
  >;
  isInitialized: boolean;
}

const initialState: PerformanceState = {
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
};

const name = 'performance';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    startPerformanceTrace: (
      state,
      action: PayloadAction<{
        eventName: string;
        metadata?: Record<string, unknown>;
        environment?: PerformanceState['environment'];
      }>,
    ) => {
      if (isTest) {
        // Initialize session if not already initialized
        if (!state.isInitialized) {
          const { environment } = action.payload;
          state.sessionId = uuidv4();
          state.startTime = Date.now();
          state.environment = {
            branch: environment?.branch || '',
            commitHash: environment?.commitHash || '',
            platform: environment?.platform || Platform.OS,
            appVersion: environment?.appVersion || '',
          };
          state.isInitialized = true;
        }

        const { eventName, metadata } = action.payload;
        state.activeTraces[eventName] = {
          startTime: Date.now(),
          metadata,
        };
      }
    },
    endPerformanceTrace: (
      state,
      action: PayloadAction<{
        eventName: string;
        additionalMetadata?: Record<string, unknown>;
      }>,
    ) => {
      if (isTest) {
        const { eventName, additionalMetadata = {} } = action.payload;
        const activeTrace = state.activeTraces[eventName];

        if (activeTrace) {
          const duration = Date.now() - activeTrace.startTime;
          state.metrics.push({
            eventName,
            timestamp: activeTrace.startTime,
            duration,
            metadata: {
              ...activeTrace.metadata,
              ...additionalMetadata,
            },
          });
          delete state.activeTraces[eventName];
        }
      }
    },
    clearPerformanceMetrics: (state) => {
      if (isTest) {
        state.metrics = [];
        state.activeTraces = {};
      }
    },
  },
});

const { actions, reducer } = slice;

// Base selector
const selectPerformanceState = (state: RootState) => state.performance;

// Selectors using createSelector
export const selectPerformanceData = createSelector(
  [selectPerformanceState],
  (performanceState) => performanceState,
);

export const selectPerformanceMetrics = createSelector(
  [selectPerformanceState],
  (performanceState) => performanceState.metrics,
);

export const selectPerformanceSession = createSelector(
  [selectPerformanceState],
  (performanceState) => ({
    sessionId: performanceState.sessionId,
    startTime: performanceState.startTime,
    environment: performanceState.environment,
  }),
);

// Actions
export const {
  startPerformanceTrace,
  endPerformanceTrace,
  clearPerformanceMetrics,
} = actions;

export default reducer;
