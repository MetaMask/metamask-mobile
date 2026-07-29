import {
  setMeasurement,
  startSpan,
  startSpanManual,
} from '@sentry/react-native';
import {
  Scope,
  type Span,
  withIsolationScope,
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

    const attributesOf = (name: TraceName) => {
      const call = startSpanManualMock.mock.calls.find(
        ([spanOptions]) => spanOptions.name === name,
      );

      return call?.[0].attributes;
    };

    beforeEach(() => {
      updateCachedConsent(true);
    });

    afterEach(() => {
      endTrace({ name: TraceName.OnboardingJourneyOverall });
    });

    it('adds the journey account type to spans in an onboarding operation', () => {
      startJourney('metamask_google');

      trace({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        op: TraceOperation.OnboardingSecurityOp,
      });
      trace({
        name: TraceName.OnboardingSocialLoginError,
        op: TraceOperation.OnboardingError,
      });
      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        op: TraceOperation.OnboardingScreenPerformance,
        id: 'choose_password',
      });

      expect(attributesOf(TraceName.OnboardingJourneyOverall)).toStrictEqual({
        account_type: 'metamask_google',
      });
      expect(
        attributesOf(TraceName.OnboardingOAuthSeedlessAuthenticate),
      ).toStrictEqual({ account_type: 'metamask_google' });
      expect(attributesOf(TraceName.OnboardingSocialLoginError)).toStrictEqual({
        account_type: 'metamask_google',
      });
      expect(
        attributesOf(TraceName.OnboardingScreenTimeToContent),
      ).toStrictEqual({ account_type: 'metamask_google' });

      endTrace({ name: TraceName.OnboardingOAuthSeedlessAuthenticate });
      endTrace({ name: TraceName.OnboardingSocialLoginError });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'choose_password',
      });
    });

    it('picks up an account type annotated after the journey span exists', () => {
      const setAttributeMock = jest.fn();
      startSpanManualMock.mockImplementationOnce((_, fn) =>
        fn(
          { setAttribute: setAttributeMock, end: jest.fn() } as unknown as Span,
          () => {
            // Intentionally empty
          },
        ),
      );

      // The social path creates the journey before the user picks a provider.
      startJourney();

      annotateTrace(
        getTraceContext({ name: TraceName.OnboardingJourneyOverall }),
        {
          'onboarding.method': 'social',
          account_type: 'imported_apple',
        },
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

    it('keeps an account type the span sets for itself', () => {
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

    it('leaves spans outside an onboarding operation untouched', () => {
      startJourney('metamask_apple');

      trace({ name: TraceName.Login, op: TraceOperation.Login });

      expect(attributesOf(TraceName.Login)).toBeUndefined();

      endTrace({ name: TraceName.Login });
    });

    it('does not carry an account type into the next journey', () => {
      startJourney('metamask_telegram');
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
    });
  });

  describe('onboarding machine time', () => {
    const createSpanMock = () => {
      const callOrder: string[] = [];
      const spanEndMock = jest.fn(() => {
        callOrder.push('end');
      });
      const setAttributeMock = jest.fn(() => {
        callOrder.push('setAttribute');
      });
      const spanMock = {
        end: spanEndMock,
        setAttribute: setAttributeMock,
      } as unknown as Span;

      return { callOrder, setAttributeMock, spanEndMock, spanMock };
    };

    /**
     * Hand out the given spans to consecutive trace() calls, in order.
     */
    const queueSpans = (spans: ReturnType<typeof createSpanMock>[]) => {
      spans.forEach(({ spanMock }) => {
        startSpanManualMock.mockImplementationOnce((_, fn) =>
          fn(spanMock, () => {
            // Intentionally empty
          }),
        );
      });
    };

    beforeEach(() => {
      updateCachedConsent(true);
    });

    it('sums the machine-time spans onto the overall journey span', () => {
      const journey = createSpanMock();
      queueSpans([
        journey,
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
      ]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 0,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        timestamp: 300,
        data: { success: true },
      });

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

      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        300 + 700 + 1_200 + 500,
      );
    });

    it('sums every screen that reached its content, across screens', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock(), createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 0,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        timestamp: 250,
        data: { success: true },
      });

      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'choose_password',
        startTime: 5_000,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'choose_password',
        timestamp: 5_150,
        data: { success: true },
      });

      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        400,
      );
    });

    it('excludes spans abandoned or unmounted before completing', () => {
      const journey = createSpanMock();
      queueSpans([
        journey,
        createSpanMock(),
        createSpanMock(),
        createSpanMock(),
      ]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 0,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        timestamp: 400,
        data: { success: true },
      });

      // Screen popped before its content rendered: duration is capped filler.
      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'choose_password',
        startTime: 1_000,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'choose_password',
        timestamp: 1_000 + TRACES_CLEANUP_INTERVAL,
        data: { success: false, reason: 'unmounted' },
      });

      // User never returned from the OAuth browser.
      trace({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        startTime: 2_000,
      });
      endTrace({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        timestamp: 2_000 + TRACES_CLEANUP_INTERVAL,
        data: { success: false, abandoned: true },
      });

      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        400,
      );
    });

    it('excludes the spans dominated by human time', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock(), createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      // The user is typing credentials in the external browser.
      trace({ name: TraceName.OnboardingOAuthProviderLogin, startTime: 0 });
      endTrace({
        name: TraceName.OnboardingOAuthProviderLogin,
        timestamp: 8_000,
        data: { success: true },
      });

      // Spans mount -> unmount of ChoosePassword, so mostly typing.
      trace({ name: TraceName.OnboardingPasswordSetupAttempt, startTime: 0 });
      endTrace({
        name: TraceName.OnboardingPasswordSetupAttempt,
        timestamp: 30_000,
      });

      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        0,
      );
    });

    it('records machine time on an abandoned journey', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 0,
      });
      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        timestamp: 275,
        data: { success: true },
      });

      endTrace({
        name: TraceName.OnboardingJourneyOverall,
        data: { success: false },
      });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        275,
      );
    });

    it('rounds the total to whole milliseconds', () => {
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

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        901,
      );
    });

    it('counts the part of a still-open span that fell inside the journey', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      // The social wallet-creation path ends the journey from inside this span.
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 1_000,
      });

      endTrace({
        name: TraceName.OnboardingJourneyOverall,
        timestamp: 3_000,
      });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        2_000,
      );

      endTrace({ name: TraceName.OnboardingSRPAccountCreationTime });
    });

    it('excludes still-open spans when the journey is abandoned', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      // Landing screen left mid-animation: this ends as unmounted later, so its
      // time-to-content never completed.
      trace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        startTime: 100,
      });

      endTrace({
        name: TraceName.OnboardingJourneyOverall,
        timestamp: 3_000,
        data: { success: false },
      });

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        0,
      );

      endTrace({
        name: TraceName.OnboardingScreenTimeToContent,
        id: 'onboarding_landing',
        data: { success: false, reason: 'unmounted' },
      });
    });

    it('does not count a nested span twice', () => {
      const journey = createSpanMock();
      queueSpans([journey, createSpanMock(), createSpanMock()]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });

      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        startTime: 1_000,
      });
      // Runs inside the span above, so its duration is already accounted for.
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

      expect(journey.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        1_500,
      );
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

      expect(firstJourney.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        900,
      );
      expect(secondJourney.setAttributeMock).toHaveBeenCalledWith(
        ONBOARDING_MACHINE_TIME_ATTRIBUTE,
        100,
      );
    });

    it('writes the attribute before the journey span is finished', () => {
      const journey = createSpanMock();
      queueSpans([journey]);

      trace({ name: TraceName.OnboardingJourneyOverall, startTime: 0 });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      expect(journey.callOrder).toStrictEqual(['setAttribute', 'end']);
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
