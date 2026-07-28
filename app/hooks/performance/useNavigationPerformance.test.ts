import { renderHook } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../util/trace';
import {
  OnboardingCtaIds,
  OnboardingScreenIds,
} from './onboardingPerformanceIds';
import {
  _resetOnboardingNavigationPerformanceForTesting,
  startOnboardingCtaNavigation,
} from './onboardingNavigationPerformanceState';
import { useNavigationPerformance } from './useNavigationPerformance';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    OnboardingCtaNavigation: 'Onboarding CTA Navigation',
  },
  TraceOperation: {
    OnboardingNavigationPerformance: 'onboarding.navigation.performance',
  },
}));

const { trace: mockTrace, endTrace: mockEndTrace } =
  jest.requireMock('../../util/trace');

describe('useNavigationPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetOnboardingNavigationPerformanceForTesting();
  });

  it('completes a pending CTA navigation span when destination becomes ready', () => {
    startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);

    renderHook(() =>
      useNavigationPerformance({
        destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
        destinationReady: true,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingCtaNavigation,
        data: expect.objectContaining({
          success: true,
          cta_id: OnboardingCtaIds.CREATE_WALLET,
          destination_screen_id: OnboardingScreenIds.CHOOSE_PASSWORD,
        }),
      }),
    );
  });

  it('starts a navigation span when CTA navigation begins', () => {
    startOnboardingCtaNavigation(OnboardingCtaIds.IMPORT_WALLET);

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingCtaNavigation,
        op: TraceOperation.OnboardingNavigationPerformance,
        tags: expect.objectContaining({
          cta_id: OnboardingCtaIds.IMPORT_WALLET,
        }),
      }),
    );
  });

  it('cancels a pending navigation span when destination unmounts before ready', () => {
    startOnboardingCtaNavigation(OnboardingCtaIds.CREATE_WALLET);

    const { unmount } = renderHook(() =>
      useNavigationPerformance({
        destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
        destinationReady: false,
      }),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'unmounted',
        }),
      }),
    );
  });
});
