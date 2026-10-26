import { AppState, type AppStateStatus } from 'react-native';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  getPerformanceTimestamp,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import {
  endVbaCufChildTrace,
  endVbaCufJourney,
  hasActiveVbaCufJourney,
  resetVbaCufTraceForTests,
  startVbaCufChildTrace,
  startVbaCufJourney,
} from './vbaCufTrace';
import {
  getVbaCufLifecycleContext,
  resetVbaCufLifecycleContextForTests,
} from './vbaCufLifecycle';
import {
  VBA_CUF_END_REASON,
  VBA_CUF_ENTRY_SURFACE,
  VBA_CUF_FEATURE,
  VBA_CUF_FLOW,
  VBA_CUF_FOREGROUND_ACTIVE_MS,
  VBA_CUF_LIFECYCLE_CONTEXT,
  VBA_CUF_TAG,
  VBA_CUF_TIMEOUT_MS,
  VBA_CUF_TRACE_MAX_LIFETIME_MS,
} from './vbaCufTags';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(() => ({ mocked: 'span' })),
  endTrace: jest.fn(),
  getPerformanceTimestamp: jest.fn(() => 0),
  setTraceMeasurement: jest.fn(),
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockGetPerformanceTimestamp = jest.mocked(getPerformanceTimestamp);
const mockSetTraceMeasurement = jest.mocked(setTraceMeasurement);
const mockDevLog = jest.mocked(DevLogger.log);

describe('vbaCufTrace', () => {
  let appState: AppStateStatus;
  let now: number;
  let appStateListeners: ((state: AppStateStatus) => void)[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetVbaCufTraceForTests();
    resetVbaCufLifecycleContextForTests();
    appState = 'active';
    now = 0;
    appStateListeners = [];
    mockGetPerformanceTimestamp.mockImplementation(() => now);
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListeners.push(listener);
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts the journey with only bounded privacy-safe tags', () => {
    const id = startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.ADD_MONEY_SHEET);
    const tags = {
      [VBA_CUF_TAG.FEATURE]: VBA_CUF_FEATURE,
      [VBA_CUF_TAG.FLOW]: VBA_CUF_FLOW,
      [VBA_CUF_TAG.LIFECYCLE_CONTEXT]: VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS,
      [VBA_CUF_TAG.ENTRY_SURFACE]: VBA_CUF_ENTRY_SURFACE.ADD_MONEY_SHEET,
    };

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.VbaToPixInstructions,
      id,
      op: TraceOperation.VbaOperation,
      forceTransaction: true,
      maxLifetimeMs: VBA_CUF_TRACE_MAX_LIFETIME_MS,
      tags,
      data: tags,
    });
    expect(Object.keys(tags)).toStrictEqual([
      'feature',
      'flow',
      'lifecycle_context',
      'entry_surface',
    ]);
  });

  it('keeps a single journey active across repeated entry gestures', () => {
    const firstId = startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);

    expect(startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.MONEY_ACTION_ROW)).toBe(
      firstId,
    );
    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(hasActiveVbaCufJourney()).toBe(true);
  });

  it('ends once with success and foreground-only duration', () => {
    const id = startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);
    const journeyStateListener = appStateListeners.at(-1);
    now = 1_000;
    appState = 'background';
    journeyStateListener?.('background');
    now = 6_000;
    appState = 'active';
    journeyStateListener?.('active');
    now = 8_000;

    endVbaCufJourney(true);
    endVbaCufJourney(true);

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: TraceName.VbaToPixInstructions, id },
      VBA_CUF_FOREGROUND_ACTIVE_MS,
      3_000,
      'millisecond',
    );
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.VbaToPixInstructions,
      id,
      data: {
        [VBA_CUF_TAG.SUCCESS]: true,
        [VBA_CUF_FOREGROUND_ACTIVE_MS]: 3_000,
        [VBA_CUF_TAG.BACKGROUND_COUNT]: 1,
        [VBA_CUF_TAG.RESUME_COUNT]: 1,
      },
    });
    expect(hasActiveVbaCufJourney()).toBe(false);
  });

  it('resumes foreground timing after the iOS inactive transition', () => {
    const id = startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);
    now = 1_000;
    appState = 'background';
    appStateListeners.forEach((listener) => listener('background'));
    now = 6_000;
    appState = 'inactive';
    appStateListeners.forEach((listener) => listener('inactive'));
    now = 8_000;
    appState = 'active';
    appStateListeners.forEach((listener) => listener('active'));
    now = 10_000;

    endVbaCufJourney(true);

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: TraceName.VbaToPixInstructions, id },
      VBA_CUF_FOREGROUND_ACTIVE_MS,
      3_000,
      'millisecond',
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.VbaToPixInstructions,
      id,
      data: {
        [VBA_CUF_TAG.SUCCESS]: true,
        [VBA_CUF_FOREGROUND_ACTIVE_MS]: 3_000,
        [VBA_CUF_TAG.BACKGROUND_COUNT]: 1,
        [VBA_CUF_TAG.RESUME_COUNT]: 1,
      },
    });
  });

  it('classifies an iOS background inactive active sequence as a resume', () => {
    getVbaCufLifecycleContext();
    const lifecycleStateListener = appStateListeners.at(-1);

    lifecycleStateListener?.('background');
    lifecycleStateListener?.('inactive');
    lifecycleStateListener?.('active');

    expect(getVbaCufLifecycleContext()).toBe(
      VBA_CUF_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );
  });

  it('ends with a bounded failure reason on timeout', () => {
    const id = startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);

    jest.advanceTimersByTime(VBA_CUF_TIMEOUT_MS);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.VbaToPixInstructions,
        id,
        data: expect.objectContaining({
          [VBA_CUF_TAG.SUCCESS]: false,
          [VBA_CUF_TAG.REASON]: VBA_CUF_END_REASON.TIMEOUT,
        }),
      }),
    );
  });

  it('emits standalone child transactions without an active journey', () => {
    const id = startVbaCufChildTrace(TraceName.VbaHydrate);

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.VbaHydrate,
        id,
        op: TraceOperation.VbaOperation,
        parentContext: undefined,
        forceTransaction: true,
      }),
    );

    endVbaCufChildTrace(id, false, VBA_CUF_END_REASON.ERROR);

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.VbaHydrate,
      id,
      data: {
        [VBA_CUF_TAG.SUCCESS]: false,
        [VBA_CUF_TAG.REASON]: VBA_CUF_END_REASON.ERROR,
      },
    });
  });

  it('links standalone child transactions when a journey context exists', () => {
    startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);
    mockTrace.mockClear();

    startVbaCufChildTrace(TraceName.VbaPixFetch);

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.VbaPixFetch,
        parentContext: { mocked: 'span' },
        forceTransaction: true,
      }),
    );
  });

  it('logs greppable start and completion markers', () => {
    startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.MONEY_ACTION_ROW);
    endVbaCufJourney(false, VBA_CUF_END_REASON.BAILED);

    expect(mockDevLog).toHaveBeenCalledWith(
      expect.stringContaining('[VbaCUF] VBA To Pix Instructions started'),
    );
    expect(mockDevLog).toHaveBeenCalledWith(
      expect.stringContaining('[VbaCUF] VBA To Pix Instructions completed'),
    );
  });
});
