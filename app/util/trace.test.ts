import {
  setMeasurement,
  startSpan,
  startSpanManual,
} from '@sentry/react-native';
import { Scope, type Span, withIsolationScope } from '@sentry/core';
import {
  endTrace,
  trace,
  TraceName,
  TRACES_CLEANUP_INTERVAL,
  flushBufferedTraces,
  bufferTraceStartCallLocal,
  bufferTraceEndCallLocal,
  discardBufferedTraces,
  updateCachedConsent,
} from './trace';
import { AGREED, DENIED } from '../constants/storage';

jest.mock('@sentry/react-native', () => ({
  startSpan: jest.fn(),
  startSpanManual: jest.fn(),
  setMeasurement: jest.fn(),
}));

jest.mock('@sentry/core', () => ({
  withIsolationScope: jest.fn(),
}));

jest.mock('../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('../store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock('../core/redux/ReduxService', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

const NAME_MOCK = TraceName.Middleware;
const ID_MOCK = 'testId';
const PARENT_CONTEXT_MOCK = {
  spanContext: () => ({
    spanId: 'parentSpanId',
  }),
} as Span;

const TAGS_MOCK = {
  tag1: 'value1',
  tag2: true,
  tag3: 123,
};

const DATA_MOCK = {
  data1: 'value1',
  data2: true,
  data3: 123,
};

describe('Trace', () => {
  const startSpanMock = jest.mocked(startSpan);
  const startSpanManualMock = jest.mocked(startSpanManual);
  // mockImplementation doesn't choose the correct overload, so we ignore the types by casting to jest.Mock
  const withIsolationScopeMock = jest.mocked(withIsolationScope) as jest.Mock;
  const setMeasurementMock = jest.mocked(setMeasurement);
  const setTagMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    startSpanMock.mockImplementation((_, fn) => fn({} as Span));

    startSpanManualMock.mockImplementation((_, fn) =>
      fn({} as Span, () => {
        // Intentionally empty
      }),
    );

    withIsolationScopeMock.mockImplementation((fn: (arg: Scope) => unknown) =>
      fn({ setTag: setTagMock } as unknown as Scope),
    );

    flushBufferedTraces();
    // Reset consent state to false by default
    updateCachedConsent(false);
  });

  describe('trace', () => {
    it('executes callback', () => {
      let callbackExecuted = false;

      trace({ name: NAME_MOCK }, () => {
        callbackExecuted = true;
      });

      endTrace({ name: NAME_MOCK });

      expect(callbackExecuted).toBe(true);
    });

    it('returns value from callback', () => {
      const result = trace({ name: NAME_MOCK }, () => true);
      endTrace({ name: NAME_MOCK });
      expect(result).toBe(true);
    });

    it('invokes Sentry if callback provided', () => {
      updateCachedConsent(true);

      trace(
        {
          name: NAME_MOCK,
          tags: TAGS_MOCK,
          data: DATA_MOCK,
          parentContext: PARENT_CONTEXT_MOCK,
        },
        () => true,
      );

      endTrace({ name: NAME_MOCK });

      expect(withIsolationScopeMock).toHaveBeenCalledTimes(1);

      expect(startSpanMock).toHaveBeenCalledTimes(1);
      expect(startSpanMock).toHaveBeenCalledWith(
        {
          name: NAME_MOCK,
          parentSpan: PARENT_CONTEXT_MOCK,
          attributes: DATA_MOCK,
          op: 'custom',
        },
        expect.any(Function),
      );

      expect(setTagMock).toHaveBeenCalledTimes(2);
      expect(setTagMock).toHaveBeenCalledWith('tag1', 'value1');
      expect(setTagMock).toHaveBeenCalledWith('tag2', true);

      expect(setMeasurementMock).toHaveBeenCalledTimes(1);
      expect(setMeasurementMock).toHaveBeenCalledWith('tag3', 123, 'none');
    });

    it('invokes Sentry if no callback provided', () => {
      updateCachedConsent(true);

      trace({
        id: ID_MOCK,
        name: NAME_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK });

      expect(withIsolationScopeMock).toHaveBeenCalledTimes(3);

      expect(startSpanManualMock).toHaveBeenCalledTimes(3);
      expect(startSpanManualMock).toHaveBeenCalledWith(
        {
          name: NAME_MOCK,
          parentSpan: PARENT_CONTEXT_MOCK,
          attributes: DATA_MOCK,
          op: 'custom',
        },
        expect.any(Function),
      );

      expect(setTagMock).toHaveBeenCalledTimes(2);
      expect(setTagMock).toHaveBeenCalledWith('tag1', 'value1');
      expect(setTagMock).toHaveBeenCalledWith('tag2', true);

      expect(setMeasurementMock).toHaveBeenCalledTimes(1);
      expect(setMeasurementMock).toHaveBeenCalledWith('tag3', 123, 'none');
    });

    it('buffers traces when consent is not given', () => {
      updateCachedConsent(false);

      trace({
        id: ID_MOCK,
        name: NAME_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });
      endTrace({ name: NAME_MOCK });

      // Sentry functions should not be called when consent is denied
      expect(withIsolationScopeMock).toHaveBeenCalledTimes(0);
      expect(startSpanMock).toHaveBeenCalledTimes(0);
      expect(startSpanManualMock).toHaveBeenCalledTimes(0);
      expect(setTagMock).toHaveBeenCalledTimes(0);
      expect(setMeasurementMock).toHaveBeenCalledTimes(0);
    });

    it('invokes Sentry if no callback provided with custom start time', () => {
      updateCachedConsent(true);

      trace({
        id: ID_MOCK,
        name: NAME_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
        startTime: 123,
      });
      endTrace({ name: NAME_MOCK });

      expect(withIsolationScopeMock).toHaveBeenCalledTimes(1);

      expect(startSpanManualMock).toHaveBeenCalledTimes(1);
      expect(startSpanManualMock).toHaveBeenCalledWith(
        {
          name: NAME_MOCK,
          parentSpan: PARENT_CONTEXT_MOCK,
          attributes: DATA_MOCK,
          op: 'custom',
          startTime: 123,
        },
        expect.any(Function),
      );

      expect(setTagMock).toHaveBeenCalledTimes(2);
      expect(setTagMock).toHaveBeenCalledWith('tag1', 'value1');
      expect(setTagMock).toHaveBeenCalledWith('tag2', true);

      expect(setMeasurementMock).toHaveBeenCalledTimes(1);
      expect(setMeasurementMock).toHaveBeenCalledWith('tag3', 123, 'none');
    });
  });

  describe('endTrace', () => {
    it('ends Sentry span matching name and specified ID', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        id: ID_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      expect(spanEndMock).toHaveBeenCalledTimes(1);
    });

    it('ends Sentry span matching name and default ID', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK });

      expect(spanEndMock).toHaveBeenCalledTimes(1);
    });

    it('ends Sentry span with custom timestamp', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        id: ID_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK, id: ID_MOCK, timestamp: 123 });

      expect(spanEndMock).toHaveBeenCalledTimes(1);
      expect(spanEndMock).toHaveBeenCalledWith(123);
    });

    it('does not end Sentry span if name and ID does not match', () => {
      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        id: ID_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK, id: 'invalidId' });

      expect(spanEndMock).toHaveBeenCalledTimes(0);
    });

    it('clears timeout when trace ends', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        id: ID_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('trace timeout cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    it('removes trace after timeout period', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({
        name: NAME_MOCK,
        id: ID_MOCK,
        tags: TAGS_MOCK,
        data: DATA_MOCK,
        parentContext: PARENT_CONTEXT_MOCK,
      });

      endTrace({ name: NAME_MOCK });

      jest.advanceTimersByTime(TRACES_CLEANUP_INTERVAL + 1000);

      expect(spanEndMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushBufferedTraces', () => {
    const StorageWrapper = jest.requireMock('../store/storage-wrapper');
    const storageGetItemMock = jest.mocked(StorageWrapper.getItem);

    beforeEach(() => {
      jest.clearAllMocks();
      discardBufferedTraces();

      const mockSpanEnd = jest.fn();
      const mockSpan = {
        end: mockSpanEnd,
      } as unknown as Span;

      startSpanMock.mockImplementation((_, fn) => fn(mockSpan));
      startSpanManualMock.mockImplementation((_, fn) =>
        fn(mockSpan, () => undefined),
      );
      withIsolationScopeMock.mockImplementation((fn: (arg: Scope) => unknown) =>
        fn({ setTag: setTagMock } as unknown as Scope),
      );
    });

    it('should clear buffer and not process traces when consent is not given', async () => {
      storageGetItemMock.mockResolvedValue(DENIED);

      bufferTraceStartCallLocal({ name: TraceName.Middleware });
      bufferTraceEndCallLocal({ name: TraceName.Middleware });

      await flushBufferedTraces();

      storageGetItemMock.mockResolvedValue(AGREED);
      jest.clearAllMocks();

      await flushBufferedTraces();

      // No Sentry functions should be called in second flush since buffer was cleared
      expect(startSpanManualMock).not.toHaveBeenCalled();
      expect(withIsolationScopeMock).not.toHaveBeenCalled();
    });

    it('should flush buffered traces when consent is given', async () => {
      storageGetItemMock.mockResolvedValue(DENIED);

      // Mock selectBufferedTraces to return the buffered traces we expect
      const mockBufferedTraces = [
        {
          type: 'start',
          request: { name: TraceName.Middleware, id: 'test1' },
        },
        {
          type: 'start',
          request: { name: TraceName.NestedTest1, id: 'test2' },
        },
        {
          type: 'end',
          request: { name: TraceName.Middleware, id: 'test1' },
        },
        {
          type: 'end',
          request: { name: TraceName.NestedTest1, id: 'test2' },
        },
      ];

      mockBufferedTraces.forEach((t) => {
        t.type === 'start'
          ? bufferTraceStartCallLocal(t.request)
          : bufferTraceEndCallLocal(t.request);
      });

      storageGetItemMock.mockResolvedValue(AGREED);
      updateCachedConsent(true);

      await flushBufferedTraces();

      expect(startSpanManualMock).toHaveBeenCalledTimes(2);
      expect(withIsolationScopeMock).toHaveBeenCalledTimes(2);
    });

    it('should handle traces with same name but different IDs correctly', async () => {
      const mockBufferedTraces = [
        {
          type: 'start',
          request: { name: TraceName.NetworkSwitch, id: 'request1' },
        },
        {
          type: 'start',
          request: { name: TraceName.NetworkSwitch, id: 'request2' },
        },
        {
          type: 'end',
          request: { name: TraceName.NetworkSwitch, id: 'request1' },
        },
        {
          type: 'end',
          request: { name: TraceName.NetworkSwitch, id: 'request2' },
        },
      ];

      mockBufferedTraces.forEach((t) => {
        t.type === 'start'
          ? bufferTraceStartCallLocal(t.request)
          : bufferTraceEndCallLocal(t.request);
      });

      updateCachedConsent(true);

      await flushBufferedTraces();

      // Both traces should be processed (2 start calls)
      expect(startSpanManualMock).toHaveBeenCalledTimes(2);
      expect(withIsolationScopeMock).toHaveBeenCalledTimes(2);
    });
  });
});
