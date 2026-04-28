import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import {
  endTrace,
  trace,
  type TraceName,
  type TraceOperation,
  type TraceValue,
} from '../../../../../util/trace';
import { ensureError } from '../../utils/predictErrorHandler';
import { type TraceableController, withTrace } from './withTrace';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../../../../util/trace', () => ({
  __esModule: true,
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../utils/predictErrorHandler', () => ({
  __esModule: true,
  ensureError: jest.fn(),
}));

interface ControllerState {
  lastError: string | null;
  lastUpdateTimestamp: number;
}

const TRACE_NAME = 'Predict Get Markets' as TraceName;
const TRACE_OPERATION = 'predict.get.markets' as TraceOperation;

const createController = (initialState?: Partial<ControllerState>) => {
  const state: ControllerState = {
    lastError: initialState?.lastError ?? 'existing-error',
    lastUpdateTimestamp: initialState?.lastUpdateTimestamp ?? 10,
  };

  const errorContext: LoggerErrorOptions = {
    tags: { feature: 'predict' },
    context: {
      name: 'withTrace-test',
      data: { unit: true },
    },
  };

  const controller: TraceableController & {
    update: jest.MockedFunction<TraceableController['update']>;
    getErrorContext: jest.MockedFunction<
      TraceableController['getErrorContext']
    >;
    state: ControllerState;
  } = {
    update: jest.fn((updater) => updater(state)),
    getErrorContext: jest.fn(
      (_method: string, _extra?: Record<string, unknown>) => errorContext,
    ),
    state,
  };

  return controller;
};

describe('withTrace', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);
  const mockEnsureError = jest.mocked(ensureError);
  const mockLogger = jest.mocked(Logger);

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureError.mockImplementation((error: unknown) =>
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns fn result, clears lastError, updates timestamp, and ends trace with success', async () => {
    const controller = createController({
      lastError: 'previous-error',
      lastUpdateTimestamp: 5,
    });
    const result = { items: 3 };
    const run = jest.fn(async () => result);
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);

    const output = await withTrace(
      controller,
      {
        method: 'getMarkets',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
          tags: { source: 'unit-test' },
          data: { page: 1 as TraceValue },
        },
      },
      run,
    );

    expect(output).toEqual(result);
    expect(run).toHaveBeenCalledTimes(1);
    expect(controller.update).toHaveBeenCalledTimes(1);
    expect(controller.state.lastError).toBeNull();
    expect(controller.state.lastUpdateTimestamp).toBe(2000);
    expect(mockTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      op: TRACE_OPERATION,
      id: 'getMarkets-1000',
      tags: { source: 'unit-test' },
      data: { page: 1 },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getMarkets-1000',
      data: { success: true },
    });
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('sets error message, logs context, re-throws Error, and ends trace with failure data', async () => {
    const controller = createController();
    const thrownError = new Error('network failed');
    const wrappedError = new Error('wrapped network failed');
    const run = jest.fn(async () => {
      throw thrownError;
    });
    mockEnsureError.mockReturnValue(wrappedError);
    jest.spyOn(Date, 'now').mockReturnValueOnce(3000).mockReturnValueOnce(4000);

    const resultPromise = withTrace(
      controller,
      {
        method: 'getBalance',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        errorContext: { accountId: '0xabc' },
      },
      run,
    );

    await expect(resultPromise).rejects.toBe(thrownError);
    expect(controller.update).toHaveBeenCalledTimes(1);
    expect(controller.state.lastError).toBe('network failed');
    expect(controller.state.lastUpdateTimestamp).toBe(4000);
    expect(controller.getErrorContext).toHaveBeenCalledWith('getBalance', {
      accountId: '0xabc',
    });
    expect(mockEnsureError).toHaveBeenCalledWith(thrownError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      wrappedError,
      controller.getErrorContext.mock.results[0].value,
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getBalance-3000',
      data: { success: false, error: 'network failed' },
    });
  });

  it('uses fallbackErrorCode when fn throws non-Error value', async () => {
    const controller = createController();
    const run = jest.fn(async () => {
      throw 'boom';
    });
    jest.spyOn(Date, 'now').mockReturnValueOnce(5000).mockReturnValueOnce(6000);

    const resultPromise = withTrace(
      controller,
      {
        method: 'getPositions',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        fallbackErrorCode: 'PREDICT_UNKNOWN_ERROR',
      },
      run,
    );

    await expect(resultPromise).rejects.toBe('boom');
    expect(controller.state.lastError).toBe('PREDICT_UNKNOWN_ERROR');
    expect(controller.state.lastUpdateTimestamp).toBe(6000);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getPositions-5000',
      data: { success: false, error: 'PREDICT_UNKNOWN_ERROR' },
    });
  });

  it('calls onSuccess with result when fn resolves', async () => {
    const controller = createController();
    const run = jest.fn(async () => 'done');
    const onSuccess = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValueOnce(7000).mockReturnValueOnce(8000);

    const output = await withTrace(
      controller,
      {
        method: 'getOrderPreview',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        onSuccess,
      },
      run,
    );

    expect(output).toBe('done');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('done');
  });

  it('does not call onSuccess when fn rejects', async () => {
    const controller = createController();
    const onSuccess = jest.fn();
    const thrownError = new Error('preview failed');
    const run = jest.fn(async () => {
      throw thrownError;
    });
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(9000)
      .mockReturnValueOnce(10000);

    const resultPromise = withTrace(
      controller,
      {
        method: 'getOrderPreview',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        onSuccess,
      },
      run,
    );

    await expect(resultPromise).rejects.toBe(thrownError);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('maps traceData from result and appends it to endTrace success payload', async () => {
    const controller = createController();
    const result = { count: 12, market: 'sports' };
    const run = jest.fn(async () => result);
    const traceData = jest.fn((value: typeof result) => ({
      market: value.market,
      count: value.count,
    }));
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(11000)
      .mockReturnValueOnce(12000);

    await withTrace(
      controller,
      {
        method: 'getActivity',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        traceData,
      },
      run,
    );

    expect(traceData).toHaveBeenCalledTimes(1);
    expect(traceData).toHaveBeenCalledWith(result);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getActivity-11000',
      data: { success: true, market: 'sports', count: 12 },
    });
  });

  it('does not update lastError or lastUpdateTimestamp on success when updateErrorState is false', async () => {
    const controller = createController({
      lastError: 'persisted-error',
      lastUpdateTimestamp: 321,
    });
    const run = jest.fn(async () => ({ ok: true }));
    jest.spyOn(Date, 'now').mockReturnValueOnce(13000);

    await withTrace(
      controller,
      {
        method: 'getPrices',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        updateErrorState: false,
      },
      run,
    );

    expect(controller.update).not.toHaveBeenCalled();
    expect(controller.state.lastError).toBe('persisted-error');
    expect(controller.state.lastUpdateTimestamp).toBe(321);
  });

  it('does not update error state on failure when updateErrorState is false and still logs error', async () => {
    const controller = createController({
      lastError: 'persisted-error',
      lastUpdateTimestamp: 654,
    });
    const thrownError = new Error('fetch failed');
    const wrappedError = new Error('wrapped fetch failed');
    const run = jest.fn(async () => {
      throw thrownError;
    });
    mockEnsureError.mockReturnValue(wrappedError);
    jest.spyOn(Date, 'now').mockReturnValueOnce(14000);

    const resultPromise = withTrace(
      controller,
      {
        method: 'getRewards',
        trace: {
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        errorContext: { tab: 'positions' },
        updateErrorState: false,
      },
      run,
    );

    await expect(resultPromise).rejects.toBe(thrownError);
    expect(controller.update).not.toHaveBeenCalled();
    expect(controller.state.lastError).toBe('persisted-error');
    expect(controller.state.lastUpdateTimestamp).toBe(654);
    expect(controller.getErrorContext).toHaveBeenCalledWith('getRewards', {
      tab: 'positions',
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      wrappedError,
      controller.getErrorContext.mock.results[0].value,
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getRewards-14000',
      data: { success: false, error: 'fetch failed' },
    });
  });
});
