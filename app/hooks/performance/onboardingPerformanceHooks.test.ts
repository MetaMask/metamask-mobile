// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'fs';
import { renderHook, act } from '@testing-library/react-native';
import Routes from '../../constants/navigation/Routes';
import { TraceName, TraceOperation } from '../../util/trace';
import {
  OnboardingCtaIds,
  OnboardingRiveAnimationIds,
  OnboardingScreenIds,
} from './onboardingPerformanceIds';
import {
  _resetOnboardingNavigationPerformanceForTesting,
  cancelPendingOnboardingCtaNavigation,
  startOnboardingCtaNavigation,
} from './onboardingNavigationPerformanceState';
import { useNavigationPerformance } from './useNavigationPerformance';
import { useRivePerformance } from './useRivePerformance';
import { useScreenPerformance } from './useScreenPerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    OnboardingScreenTimeToContent: 'ttc',
    OnboardingScreenDataFetch: 'fetch',
    OnboardingRiveReady: 'rive',
    OnboardingCtaNavigation: 'nav',
  },
  TraceOperation: {
    OnboardingScreenPerformance: 'screen',
    OnboardingRivePerformance: 'rive',
    OnboardingNavigationPerformance: 'nav',
  },
}));

jest.mock('./useRenderStormMonitor', () => ({
  useRenderStormMonitor: jest.fn(),
}));

const { trace: mockTrace, endTrace: mockEndTrace } =
  jest.requireMock('../../util/trace');

const expectEnd = (partial: Record<string, unknown>) => {
  expect(mockEndTrace).toHaveBeenCalledWith(expect.objectContaining(partial));
};

describe('onboarding performance hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetOnboardingNavigationPerformanceForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useScreenPerformance', () => {
    it('starts and ends time-to-content', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useScreenPerformance({
            screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
            contentReady,
            isEmpty: false,
          }),
        { initialProps: { contentReady: false } },
      );
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingScreenTimeToContent,
          op: TraceOperation.OnboardingScreenPerformance,
        }),
      );
      rerender({ contentReady: true });
      expectEnd({
        name: TraceName.OnboardingScreenTimeToContent,
        data: expect.objectContaining({ success: true }),
      });
    });

    it('respects enabled:false', () => {
      renderHook(() =>
        useScreenPerformance({
          screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          contentReady: false,
          isEmpty: false,
          enabled: false,
        }),
      );
      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('records the first data-fetch cycle', () => {
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useScreenPerformance({
            screenId: OnboardingScreenIds.IMPORT_SRP,
            contentReady: true,
            isEmpty: false,
            isLoading,
          }),
        { initialProps: { isLoading: false } },
      );
      rerender({ isLoading: true });
      rerender({ isLoading: false });
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({ name: TraceName.OnboardingScreenDataFetch }),
      );
      expectEnd({
        name: TraceName.OnboardingScreenDataFetch,
        data: expect.objectContaining({ success: true }),
      });
    });
  });

  describe('useRivePerformance', () => {
    const foxLoader = () =>
      useRivePerformance({
        animationId: OnboardingRiveAnimationIds.FOX_LOADER,
        timeoutMs: 1000,
      });

    it('records play, timeout, and error outcomes', () => {
      const { result } = renderHook(foxLoader);
      act(() => {
        result.current.riveHandlers.onPlay();
      });
      expectEnd({ data: expect.objectContaining({ outcome: 'play' }) });

      renderHook(foxLoader);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expectEnd({ data: expect.objectContaining({ outcome: 'timeout' }) });

      jest.clearAllMocks();
      const { result: errorResult } = renderHook(foxLoader);
      act(() => {
        errorResult.current.riveHandlers.onError({
          message: 'Rive failed',
          type: 'load_error',
        });
      });
      expectEnd({ data: expect.objectContaining({ outcome: 'error' }) });

      jest.clearAllMocks();
      const { unmount: unmountPending } = renderHook(foxLoader);
      unmountPending();
      expectEnd({ data: expect.objectContaining({ outcome: 'unmounted' }) });

      jest.clearAllMocks();
      renderHook(() =>
        useRivePerformance({
          animationId: OnboardingRiveAnimationIds.FOX_LOADER,
          enabled: false,
        }),
      );
      expect(mockTrace).not.toHaveBeenCalled();
    });
  });

  describe('navigation performance', () => {
    it('completes pending navigation spans', () => {
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);
      renderHook(() =>
        useNavigationPerformance({
          destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          destinationReady: true,
        }),
      );
      expectEnd({
        name: TraceName.OnboardingCtaNavigation,
        data: expect.objectContaining({
          cta_id: OnboardingCtaIds.CREATE_WALLET,
        }),
      });

      jest.clearAllMocks();
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);
      const { unmount } = renderHook(() =>
        useNavigationPerformance({
          destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
          destinationReady: false,
        }),
      );
      unmount();
      expectEnd({
        name: TraceName.OnboardingCtaNavigation,
        data: expect.objectContaining({ success: false, reason: 'unmounted' }),
      });

      jest.clearAllMocks();
      startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);
      startOnboardingCtaNavigation(OnboardingCtaIds.IMPORT_WALLET);
      expectEnd({
        name: TraceName.OnboardingCtaNavigation,
        data: expect.objectContaining({
          success: false,
          reason: 'superseded',
          cta_id: OnboardingCtaIds.CREATE_WALLET,
        }),
      });

      jest.clearAllMocks();
      startOnboardingCtaNavigation(OnboardingCtaIds.SOCIAL_LOGIN_GOOGLE);
      cancelPendingOnboardingCtaNavigation('social_login_failed');
      expectEnd({
        data: expect.objectContaining({
          success: false,
          reason: 'social_login_failed',
        }),
      });
    });
  });

  // Sentry's default scrubber matches values as well as keys, so an id carrying
  // one of these substrings reaches Sentry as [Filtered] on every tag and
  // breadcrumb that includes it.
  it.each([
    ['screen', OnboardingScreenIds],
    ['rive animation', OnboardingRiveAnimationIds],
    ['cta', OnboardingCtaIds],
  ])('keeps %s ids clear of Sentry-scrubbed substrings', (_label, ids) => {
    const scrubbed =
      /password|passwd|secret|api_key|apikey|auth|credentials|mysql_pwd|privatekey|private_key|token|bearer/i;

    Object.values(ids).forEach((id) => expect(id).not.toMatch(scrubbed));
  });

  // A CTA span starts in Onboarding and must be ended by the screen its route
  // registers. Most screen directories are named after their route; the social
  // destinations are shared components serving several routes.
  it.each([
    [Routes.ONBOARDING.CHOOSE_PASSWORD, 'ChoosePassword/index.tsx'],
    [
      Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
      'ImportFromSecretRecoveryPhrase/index.tsx',
    ],
    [
      Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
      'OAuthRehydration/index.tsx',
    ],
    ['AccountAlreadyExists / AccountNotFound', 'AccountStatus/index.tsx'],
    [
      Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER,
      'SocialLoginIosUser/index.tsx',
    ],
  ])('instruments the registered %s destination', (_routeName, entry) => {
    const path = `${__dirname}/../../components/Views/${entry}`;

    expect(readFileSync(path, 'utf8')).toContain('useNavigationPerformance({');
  });
});
