import { renderHook } from '@testing-library/react-native';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';
import { usePredictNextMeasurement } from './usePredictNextMeasurement';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PredictNextHomeView: 'PredictNext Home View',
  },
  TraceOperation: {
    PredictOperation: 'predict.operation',
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'trace-id-1',
}));

describe('usePredictNextMeasurement', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a trace on mount and ends it when conditions become true', () => {
    const { rerender } = renderHook(
      ({ ready }) =>
        usePredictNextMeasurement({
          traceName: TraceName.PredictNextHomeView,
          conditions: [ready],
          debugContext: { eventCount: 0 },
        }),
      { initialProps: { ready: false } },
    );

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextHomeView,
      op: TraceOperation.PredictOperation,
      id: 'trace-id-1',
      tags: { feature: PREDICT_NEXT_FEATURE_NAME },
      data: { eventCount: 0 },
    });
    expect(mockEndTrace).not.toHaveBeenCalled();

    rerender({ ready: true });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextHomeView,
      id: 'trace-id-1',
      data: { success: true },
    });
  });

  it('does not end the trace a second time after conditions stay true', () => {
    const { rerender } = renderHook(
      ({ ready }) =>
        usePredictNextMeasurement({
          traceName: TraceName.PredictNextHomeView,
          conditions: [ready],
        }),
      { initialProps: { ready: false } },
    );

    rerender({ ready: true });
    rerender({ ready: true });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('ends an open trace as unmounted when the consumer unmounts', () => {
    const { unmount } = renderHook(() =>
      usePredictNextMeasurement({
        traceName: TraceName.PredictNextHomeView,
        conditions: [false],
      }),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextHomeView,
      id: 'trace-id-1',
      data: { success: false, reason: 'unmounted' },
    });
  });

  it('does not end a completed trace as unmounted', () => {
    const { unmount } = renderHook(() =>
      usePredictNextMeasurement({
        traceName: TraceName.PredictNextHomeView,
        conditions: [true],
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextHomeView,
      id: 'trace-id-1',
      data: { success: true },
    });

    unmount();

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });
});
