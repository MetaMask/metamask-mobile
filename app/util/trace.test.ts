import {
  setMeasurement,
  startSpan,
  startSpanManual,
} from '@sentry/react-native';
import {
  Scope,
  type Span,
  withIsolationScope,
  startNewTrace,
  SPAN_STATUS_ERROR,
} from '@sentry/core';
import {
  endTrace,
  trace,
  annotateTrace,
  getTraceContext,
  ONBOARDING_MACHINE_TIME_ATTRIBUTE,
  TraceName,
  TraceOperation,
  TRACES_CLEANUP_INTERVAL,
  flushBufferedTraces,
  bufferTraceStartCallLocal,
  bufferTraceEndCallLocal,
  discardBufferedTraces,
  applyPendingOnboardingMachineTime,
  _resetOnboardingMachineTimeForTesting,
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
  startNewTrace: jest.fn((fn: () => unknown) => fn()),
  SPAN_STATUS_ERROR: 2,
}));

jest.mock('../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('redux-persist-filesystem-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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
  const startNewTraceMock = jest.mocked(startNewTrace) as jest.Mock;
  const setMeasurementMock = jest.mocked(setMeasurement);
  const setTagMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    startSpanMock.mockImplementation((_, fn) => fn({} as Span));

    startSpanManualMock.mockImplementation((_, fn) =>
      fn(
        {
          end: jest.fn(),
          setStatus: jest.fn(),
          setAttribute: jest.fn(),
        } as unknown as Span,
        () => {
          // Intentionally empty
        },
      ),
    );

    withIsolationScopeMock.mockImplementation((fn: (arg: Scope) => unknown) =>
      fn({ setTag: setTagMock } as unknown as Scope),
    );
    startNewTraceMock.mockImplementation((fn: () => unknown) => fn());

    flushBufferedTraces();
    updateCachedConsent(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

      endTrace({ name: NAME_MOCK, id: ID_MOCK });

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
      endTrace({ name: NAME_MOCK, id: ID_MOCK });

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

    it('starts a new trace when forceTransaction is set without parentContext', () => {
      updateCachedConsent(true);

      trace({ id: ID_MOCK, name: NAME_MOCK, forceTransaction: true });
      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      expect(startNewTraceMock).toHaveBeenCalledTimes(1);
      expect(startSpanManualMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: NAME_MOCK,
          forceTransaction: true,
          parentSpan: null,
        }),
        expect.any(Function),
      );
    });

    it('does not start a new trace when forceTransaction has parentContext', () => {
      updateCachedConsent(true);

      trace({
        id: ID_MOCK,
        name: NAME_MOCK,
        forceTransaction: true,
        parentContext: PARENT_CONTEXT_MOCK,
      });
      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      expect(startNewTraceMock).not.toHaveBeenCalled();
    });

    it('falls back to Date.now when performance.timeOrigin is broken (RN Android)', () => {
      updateCachedConsent(true);
      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(1_784_058_945_744);
      const originalTimeOrigin = performance.timeOrigin;
      const originalNow = performance.now;
      Object.defineProperty(performance, 'timeOrigin', {
        configurable: true,
        value: 0,
      });
      performance.now = jest.fn(() => 20_863_969.339);

      try {
        trace({
          id: ID_MOCK,
          name: NAME_MOCK,
        });

        expect(startSpanManualMock).toHaveBeenCalledWith(
          expect.objectContaining({
            startTime: 1_784_058_945_744,
          }),
          expect.any(Function),
        );
      } finally {
        Object.defineProperty(performance, 'timeOrigin', {
          configurable: true,
          value: originalTimeOrigin,
        });
        performance.now = originalNow;
        dateNowSpy.mockRestore();
        endTrace({ name: NAME_MOCK, id: ID_MOCK });
      }
    });
  });

  describe('annotateTrace', () => {
    it('sets attributes on the provided span context', () => {
      const setAttributeMock = jest.fn();
      const spanMock = {
        setAttribute: setAttributeMock,
      } as unknown as Span;

      annotateTrace(spanMock, {
        'onboarding.method': 'social',
        account_type: 'imported_telegram',
      });

      expect(setAttributeMock).toHaveBeenCalledWith(
        'onboarding.method',
        'social',
      );
      expect(setAttributeMock).toHaveBeenCalledWith(
        'account_type',
        'imported_telegram',
      );
    });

    it('no-ops when context is undefined', () => {
      expect(() =>
        annotateTrace(undefined, { 'onboarding.method': 'srp' }),
      ).not.toThrow();
    });
  });

  describe('getTraceContext', () => {
    it('returns the pending span for an open manual trace', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = { end: spanEndMock } as unknown as Span;

      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({ name: NAME_MOCK });

      expect(getTraceContext({ name: NAME_MOCK })).toBe(spanMock);
      endTrace({ name: NAME_MOCK });
    });

    it('returns undefined when no pending trace matches', () => {
      expect(getTraceContext({ name: NAME_MOCK })).toBeUndefined();
    });
  });

  describe('endTrace', () => {
    it('ends Sentry span matching name and specified ID', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;

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
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;

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
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;

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
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;

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

      // Clean up the pending trace/timeout to prevent Jest open-handle warnings
      endTrace({ name: NAME_MOCK, id: ID_MOCK });
    });

    it('clears timeout when trace ends', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;
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

  describe('onboarding account type', () => {
    const startJourney = (accountType?: string) => {
      trace({
        name: TraceName.OnboardingJourneyOverall,
        op: TraceOperation.OnboardingUserJourney,
        tags: accountType ? { account_type: accountType } : undefined,
      });
    };

    const attributesOf = (name: TraceName) =>
      startSpanManualMock.mock.calls.find(
        ([spanOptions]) => spanOptions.name === name,
      )?.[0].attributes;

    beforeEach(() => updateCachedConsent(true));
    afterEach(() => endTrace({ name: TraceName.OnboardingJourneyOverall }));

    it('propagates account_type from the journey to onboarding child spans', () => {
      startJourney('metamask_google');

      const childSpans: [TraceName, string, string | undefined][] = [
        [
          TraceName.OnboardingOAuthSeedlessAuthenticate,
          TraceOperation.OnboardingSecurityOp,
          undefined,
        ],
        [
          TraceName.OnboardingSocialLoginError,
          TraceOperation.OnboardingError,
          undefined,
        ],
        [
          TraceName.OnboardingScreenTimeToContent,
          TraceOperation.OnboardingScreenPerformance,
          'choose_password',
        ],
      ];

      childSpans.forEach(([name, op, id]) => {
        trace({ name, op, ...(id ? { id } : {}) });
        expect(attributesOf(name)).toStrictEqual({
          account_type: 'metamask_google',
        });
        endTrace({ name, ...(id ? { id } : {}) });
      });
    });

    it('picks up account_type annotated after the journey span exists', () => {
      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(
          { setAttribute: jest.fn(), end: jest.fn() } as unknown as Span,
          () => {
            // Intentionally empty
          },
        ),
      );
      startJourney();
      annotateTrace(
        getTraceContext({ name: TraceName.OnboardingJourneyOverall }),
        { account_type: 'imported_apple' },
      );
      trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
      });
      expect(
        attributesOf(TraceName.OnboardingPasswordLoginAttempt),
      ).toStrictEqual({ account_type: 'imported_apple' });
      endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
    });

    it('keeps a span-specific account_type over the journey default', () => {
      startJourney('imported_google');
      trace({
        name: TraceName.OnboardingSRPAccountImportTime,
        op: TraceOperation.OnboardingUserJourney,
        data: { account_type: 'srp_import' },
      });
      expect(
        attributesOf(TraceName.OnboardingSRPAccountImportTime),
      ).toStrictEqual({ account_type: 'srp_import' });
      endTrace({ name: TraceName.OnboardingSRPAccountImportTime });
    });

    it('does not tag non-onboarding spans or carry account_type into the next journey', () => {
      startJourney('metamask_apple');
      trace({ name: TraceName.Login, op: TraceOperation.Login });
      expect(attributesOf(TraceName.Login)).toBeUndefined();
      endTrace({ name: TraceName.Login });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      startJourney();
      trace({
        name: TraceName.OnboardingSocialLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
      });
      expect(
        attributesOf(TraceName.OnboardingSocialLoginAttempt),
      ).toBeUndefined();
      endTrace({ name: TraceName.OnboardingSocialLoginAttempt });
      endTrace({ name: TraceName.OnboardingJourneyOverall });
    });
  });

  describe('onboarding machine time', () => {
    type JourneySpanMock = ReturnType<typeof createSpanMock>;

    const createSpanMock = () => {
      const callOrder: string[] = [];
      const setAttributeMock = jest.fn(() => {
        callOrder.push('setAttribute');
      });
      const spanEndMock = jest.fn(() => {
        callOrder.push('end');
      });

      return {
        callOrder,
        setAttributeMock,
        spanEndMock,
        spanMock: {
          end: spanEndMock,
          setAttribute: setAttributeMock,
        } as unknown as Span,
      };
    };

    const queueSpans = (spans: JourneySpanMock[]) => {
      spans.forEach(({ spanMock }) => {
        startSpanManualMock.mockImplementationOnce((_, fn) =>
          fn(spanMock, () => {
            // Intentionally empty
          }),
        );
      });
    };

    const expectMachineTime = (journey: JourneySpanMock, expected: number) => {
      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        expected,
      );
    };

    const endScreenTtc = (
      id: string,
      start: number,
      end: number,
      success = true,
    ) => {
      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id,
        startTime: start,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id,
        timestamp: end,
        data: success
          ? { success: true }
          : { success: false, reason: 'unmounted' },
      });
    };

    const bufferLandingTtc = (duration = 275) => {
      updateCachedConsent(false);
      bufferTraceStartCallLocal({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 0,
      });
      bufferTraceEndCallLocal({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        timestamp: duration,
        data: { success: true, screen_id: 'onboarding_landing' },
      });
      updateCachedConsent(true);
    };

    beforeEach(() => {
      _resetOnboardingMachineTimeForTesting();
      updateCachedConsent(true);
    });

    it('sums successful machine-time spans and writes the attribute before end', () => {
      const journey = createSpanMock();
      queueSpans([
        journey,
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
      ]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      endScreenTtc('onboarding_landing', 0, 300);
      trace({
        name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
        startTime: 1_000,
      });
      endTrace({
        name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
        timestamp: 1_700,
        data: { success: true },
      });
      trace({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        startTime: 2_000,
      });
      endTrace({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        timestamp: 3_200,
        data: { success: true },
      });
      trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        startTime: 4_000,
      });
      endTrace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        timestamp: 4_500,
      });
      endScreenTtc('choose_password', 5_000, 5_150);
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(journey, 300 + 700 + 1_200 + 500 + 150);
      expect(journey.callOrder).toStrictEqual(['setAttribute', 'end']);
    });

    it.each([
      [
        'failed spans',
        400,
        false,
        (journey: JourneySpanMock) => {
          queueSpans([
            journey,
            createSpanMock(),
            createSpanMock(),
            createSpanMock(),
          ]);
          trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
          endScreenTtc('onboarding_landing', 0, 400);
          endScreenTtc(
            'choose_password',
            1_000,
            1_000 + TRACES_CLEANUP_INTERVAL,
            false,
          );
          trace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticate,
            startTime: 2_000,
          });
          endTrace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticate,
            timestamp: 2_000 + TRACES_CLEANUP_INTERVAL,
            data: { success: false, abandoned: true },
          });
        },
      ],
      [
        'human-dominated spans',
        0,
        false,
        (journey: JourneySpanMock) => {
          queueSpans([journey, createSpanMock(), createSpanMock()]);
          trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
          trace({ name: TraceName.OnboardingOAuthProviderLogin, startTime: 0 });
          endTrace({
            name: TraceName.OnboardingOAuthProviderLogin,
            timestamp: 8_000,
            data: { success: true },
          });
          trace({
            name: TraceName.OnboardingPasswordSetupAttempt,
            startTime: 0,
          });
          endTrace({
            name: TraceName.OnboardingPasswordSetupAttempt,
            timestamp: 30_000,
          });
        },
      ],
      [
        'completed spans on an abandoned journey',
        275,
        true,
        (journey: JourneySpanMock) => {
          queueSpans([journey, createSpanMock()]);
          trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
          endScreenTtc('onboarding_landing', 0, 275);
        },
      ],
      [
        'still-open spans on an abandoned journey',
        0,
        true,
        (journey: JourneySpanMock) => {
          queueSpans([journey, createSpanMock()]);
          trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
          trace({
            name: TraceName.OnboardingScreenTimeToContent,
            id: 'onboarding_landing',
            startTime: 100,
          });
        },
      ],
    ])('excludes %s', (_label, expected, abandoned, runScenario) => {
      const journey = createSpanMock();
      runScenario(journey);
      endTrace({
        name: TraceName.OnboardingJourneyOverall,
        ...(abandoned ? { data: { success: false } } : {}),
      });
      if (_label === 'still-open spans on an abandoned journey') {
        endTrace({
          name: TraceName.OnboardingScreenTimeToContent,
          id: 'onboarding_landing',
          data: { success: false, reason: 'unmounted' },
        });
      }
      expectMachineTime(journey, expected);
    });

    it('counts open spans on a successful journey end', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 1_000,
      });
      endTrace({
        name: TraceName.OnboardingJourneyOverall,
        timestamp: 3_000,
      });

      expectMachineTime(journey, 2_000);
      endTrace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        timestamp: 2_500,
      });
    });

    it('does not count nested machine-time spans twice', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock(), createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 1_000,
      });
      trace({
        name: TraceName.OnboardingCreateKeyAndBackupSrp,
        startTime: 1_200,
      });
      endTrace({
        name: TraceName.OnboardingCreateKeyAndBackupSrp,
        timestamp: 1_800,
        data: { success: true },
      });
      endTrace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        timestamp: 2_500,
      });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(journey, 1_500);
    });

    it('rounds machine time to whole milliseconds', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 1_000.25,
      });
      endTrace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        timestamp: 1_900.9,
      });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(journey, 901);
    });

    it('seeds a recreated journey with machine time harvested on discard', () => {
      updateCachedConsent(false);
      bufferLandingTtc();
      bufferTraceStartCallLocal({
        name: TraceName.OnboardingJourneyOverall,
        startTime: 0,
      });
      discardBufferedTraces();

      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);
      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 300 });
      endScreenTtc('choose_pw', 300, 700);
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(journey, 675);
    });

    it.each([
      ['reused journey with applyPending', true, 275, 1],
      ['reused journey without applyPending', false, 0, 1],
    ])('%s', (_label, applyPending, expected, expectedStarts) => {
      const journey = createSpanMock();
      queueSpans([journey]);
      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      bufferLandingTtc();
      discardBufferedTraces();
      if (applyPending) {
        applyPendingOnboardingMachineTime();
      }
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(journey, expected);
      expect(startSpanManualMock).toHaveBeenCalledTimes(expectedStarts);
    });

    it('starts each journey from zero', () => {
      const firstJourney = createSpanMock();
      const secondJourney = createSpanMock();
      queueSpans([
        firstJourney,
        createSpanMock(),
        secondJourney,
        createSpanMock(),
      ]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 0,
      });
      endTrace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        timestamp: 900,
      });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 10_000 });
      trace({
        name: TraceName.OnboardingSRPAccountImportTime,
        startTime: 10_000,
      });
      endTrace({
        name: TraceName.OnboardingSRPAccountImportTime,
        timestamp: 10_100,
      });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expectMachineTime(firstJourney, 900);
      expectMachineTime(secondJourney, 100);
    });
  });

  describe('trace lifecycle limits', () => {
    const createSpanMock = () => {
      const spanEndMock = jest.fn();
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;
      return { spanEndMock, spanMock };
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ends an active span even if cached consent changes after the trace started', () => {
      updateCachedConsent(true);

      const { spanEndMock, spanMock } = createSpanMock();
      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({ name: NAME_MOCK, id: ID_MOCK });

      // Consent changes during onboarding (e.g. cached consent reset) while
      // the span started under enabled consent is still active.
      updateCachedConsent(false);

      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      expect(spanEndMock).toHaveBeenCalledTimes(1);
    });

    it('buffers the end request only when no active trace exists and consent is not enabled', async () => {
      updateCachedConsent(false);
      discardBufferedTraces();

      endTrace({ name: NAME_MOCK, id: ID_MOCK });

      // The buffered end call is replayed on flush once consent is enabled.
      updateCachedConsent(true);
      await flushBufferedTraces();

      // No span was ever started, so nothing is sent to Sentry.
      expect(startSpanManualMock).not.toHaveBeenCalled();
    });

    it('caps a requested end timestamp at the five-minute maximum lifetime', () => {
      updateCachedConsent(true);

      const startTime = 1_000;
      const { spanEndMock, spanMock } = createSpanMock();
      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({ name: NAME_MOCK, id: ID_MOCK, startTime });

      // Simulates endTrace running hours late after the app was backgrounded.
      endTrace({
        name: NAME_MOCK,
        id: ID_MOCK,
        timestamp: startTime + TRACES_CLEANUP_INTERVAL + 3 * 60 * 60 * 1000,
      });

      expect(spanEndMock).toHaveBeenCalledTimes(1);
      expect(spanEndMock).toHaveBeenCalledWith(
        startTime + TRACES_CLEANUP_INTERVAL,
      );
    });

    it('records at most five minutes when the cleanup timer runs after an extended background period', () => {
      jest.useFakeTimers();
      updateCachedConsent(true);

      const startTime = 5_000;
      const { spanEndMock, spanMock } = createSpanMock();
      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(spanMock, () => {
          // Intentionally empty
        }),
      );

      trace({ name: NAME_MOCK, id: ID_MOCK, startTime });

      // Timers can execute hours late after backgrounding; regardless of when
      // the cleanup runs, the recorded end time is the capped maximum.
      jest.advanceTimersByTime(TRACES_CLEANUP_INTERVAL + 1);

      expect(spanEndMock).toHaveBeenCalledTimes(1);
      expect(spanEndMock).toHaveBeenCalledWith(
        startTime + TRACES_CLEANUP_INTERVAL,
      );
    });

    it('finishes the previous span with a capped timestamp when a duplicate trace key is started', () => {
      updateCachedConsent(true);

      const startTime = 1_000;
      const first = createSpanMock();
      const second = createSpanMock();
      startSpanManualMock
        .mockImplementationOnce((_, fn) =>
          fn(first.spanMock, () => {
            // Intentionally empty
          }),
        )
        .mockImplementationOnce((_, fn) =>
          fn(second.spanMock, () => {
            // Intentionally empty
          }),
        );

      trace({ name: NAME_MOCK, id: ID_MOCK, startTime });
      trace({ name: NAME_MOCK, id: ID_MOCK, startTime });

      // The previous span is finished immediately, never exceeding its cap.
      expect(first.spanEndMock).toHaveBeenCalledTimes(1);
      expect(first.spanEndMock.mock.calls[0][0]).toBeLessThanOrEqual(
        startTime + TRACES_CLEANUP_INTERVAL,
      );
      expect(second.spanEndMock).not.toHaveBeenCalled();

      // The new trace remains active and closable.
      endTrace({ name: NAME_MOCK, id: ID_MOCK });
      expect(second.spanEndMock).toHaveBeenCalledTimes(1);
    });

    it('does not let an old duplicate-key timeout delete the newer span', () => {
      jest.useFakeTimers();
      updateCachedConsent(true);

      const first = createSpanMock();
      const second = createSpanMock();
      startSpanManualMock
        .mockImplementationOnce((_, fn) =>
          fn(first.spanMock, () => {
            // Intentionally empty
          }),
        )
        .mockImplementationOnce((_, fn) =>
          fn(second.spanMock, () => {
            // Intentionally empty
          }),
        );

      trace({ name: NAME_MOCK, id: ID_MOCK, startTime: 0 });

      // Four minutes later the same key is started again.
      jest.advanceTimersByTime(4 * 60 * 1000);
      trace({ name: NAME_MOCK, id: ID_MOCK, startTime: 4 * 60 * 1000 });

      expect(first.spanEndMock).toHaveBeenCalledTimes(1);

      // Two more minutes pass — past the first trace's original five-minute
      // mark. Its (cleared) timer must not end or delete the newer trace.
      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(second.spanEndMock).not.toHaveBeenCalled();

      // The newer trace is still tracked and ends normally.
      endTrace({ name: NAME_MOCK, id: ID_MOCK });
      expect(second.spanEndMock).toHaveBeenCalledTimes(1);

      // No further cleanup fires for either trace.
      jest.advanceTimersByTime(TRACES_CLEANUP_INTERVAL + 1);
      expect(first.spanEndMock).toHaveBeenCalledTimes(1);
      expect(second.spanEndMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('trace timeout cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('removes trace after timeout period', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const spanMock = {
        end: spanEndMock,
        setStatus: jest.fn(),
        setAttribute: jest.fn(),
      } as unknown as Span;

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

    it('marks span as timed out with deadline_exceeded status when cleanup fires for open span', () => {
      updateCachedConsent(true);

      const spanEndMock = jest.fn();
      const setStatusMock = jest.fn();
      const setAttributeMock = jest.fn();
      const spanMock = {
        end: spanEndMock,
        setStatus: setStatusMock,
        setAttribute: setAttributeMock,
      } as unknown as Span;

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
      });

      jest.advanceTimersByTime(TRACES_CLEANUP_INTERVAL);

      expect(setStatusMock).toHaveBeenCalledWith({
        code: SPAN_STATUS_ERROR,
        message: 'deadline_exceeded',
      });
      expect(setAttributeMock).toHaveBeenCalledWith('trace.timed_out', true);
      expect(spanEndMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushBufferedTraces', () => {
    const StorageWrapper = jest.requireMock('../store/storage-wrapper');
    const storageGetItemMock = jest.mocked(StorageWrapper.getItem);

    beforeEach(() => {
      jest.resetAllMocks();
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
