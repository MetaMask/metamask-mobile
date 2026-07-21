import { endTrace, trace, TraceName, TraceOperation } from '../../../util/trace';
import {
  emitSocialLoginPreProviderTrace,
  endSocialLoginPreProviderTrace,
  measureSocialLoginPreProviderStep,
  startSocialLoginPreProviderTimings,
  SocialLoginPreProviderTimings,
} from './socialLoginPreProviderTrace';

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

describe('socialLoginPreProviderTrace', () => {
  let dateNowSpy: jest.SpyInstance;

  const mockDateNowSequence = (...values: number[]) => {
    values.forEach((value) => dateNowSpy.mockReturnValueOnce(value));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('startSocialLoginPreProviderTimings', () => {
    it('captures the tap time and starts with no recorded steps', () => {
      mockDateNowSequence(1000);

      const timings = startSocialLoginPreProviderTimings();

      expect(timings).toEqual({ tapTime: 1000, steps: {} });
    });
  });

  describe('measureSocialLoginPreProviderStep', () => {
    it('returns the operation result and records the step boundaries', async () => {
      mockDateNowSequence(1000, 1100, 1250);
      const timings = startSocialLoginPreProviderTimings();

      const result = await measureSocialLoginPreProviderStep(
        timings,
        'networkCheck',
        async () => 'net-state',
      );

      expect(result).toBe('net-state');
      expect(timings.steps.networkCheck).toEqual({ start: 1100, end: 1250 });
    });

    it('records the step boundaries when the operation rejects', async () => {
      mockDateNowSequence(1000, 1100, 1250);
      const timings = startSocialLoginPreProviderTimings();

      await expect(
        measureSocialLoginPreProviderStep(timings, 'sentrySetup', async () => {
          throw new Error('sentry failed');
        }),
      ).rejects.toThrow('sentry failed');

      expect(timings.steps.sentrySetup).toEqual({ start: 1100, end: 1250 });
    });
  });

  describe('emitSocialLoginPreProviderTrace', () => {
    const buildTimings = (): SocialLoginPreProviderTimings => ({
      tapTime: 1000,
      steps: {
        networkCheck: { start: 1010, end: 1150 },
        metricsEnable: { start: 1160, end: 1400 },
        sentrySetup: { start: 1410, end: 1900 },
      },
    });

    it('starts the parent span backdated to the tap time with the provided tags', () => {
      const parentContext = { _name: 'parent' };
      mockTrace.mockReturnValue(parentContext as never);

      const result = emitSocialLoginPreProviderTrace(buildTimings(), {
        provider: 'google',
        flow: 'create',
      });

      expect(result).toBe(parentContext);
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginPreProvider,
        op: TraceOperation.OnboardingUserJourney,
        startTime: 1000,
        tags: { provider: 'google', flow: 'create' },
      });
    });

    it('emits one backdated child span per recorded step under the parent', () => {
      const parentContext = { _name: 'parent' };
      mockTrace.mockReturnValue(parentContext as never);

      emitSocialLoginPreProviderTrace(buildTimings(), { provider: 'apple' });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginNetworkCheck,
        op: TraceOperation.OnboardingUserJourney,
        startTime: 1010,
        parentContext,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginNetworkCheck,
        timestamp: 1150,
      });
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginMetricsEnable,
        op: TraceOperation.OnboardingUserJourney,
        startTime: 1160,
        parentContext,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginMetricsEnable,
        timestamp: 1400,
      });
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginSentrySetup,
        op: TraceOperation.OnboardingUserJourney,
        startTime: 1410,
        parentContext,
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginSentrySetup,
        timestamp: 1900,
      });
    });

    it('skips steps without recorded timings', () => {
      mockTrace.mockReturnValue(undefined as never);
      const timings: SocialLoginPreProviderTimings = {
        tapTime: 1000,
        steps: { metricsEnable: { start: 1160, end: 1400 } },
      };

      emitSocialLoginPreProviderTrace(timings, { provider: 'google' });

      const tracedNames = mockTrace.mock.calls.map(([request]) => request.name);
      expect(tracedNames).toEqual([
        TraceName.OnboardingSocialLoginPreProvider,
        TraceName.OnboardingSocialLoginMetricsEnable,
      ]);
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('endSocialLoginPreProviderTrace', () => {
    it('ends the parent trace with the outcome data', () => {
      endSocialLoginPreProviderTrace({
        reachedOAuth: false,
        reason: 'ios_google_login_unsupported',
        iosGoogleWarningShown: false,
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginPreProvider,
        data: {
          reached_oauth: false,
          reason: 'ios_google_login_unsupported',
          ios_google_warning_shown: false,
        },
      });
    });

    it('omits optional outcome fields that are not provided', () => {
      endSocialLoginPreProviderTrace({ reachedOAuth: true });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingSocialLoginPreProvider,
        data: { reached_oauth: true },
      });
    });
  });
});
