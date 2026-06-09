import { renderHook, act } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { useOptout } from './useOptout';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { resetRewardsState } from '../../../../reducers/rewards';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useBulkLinkState } from './useBulkLinkState';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  resetRewardsState: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockIdentify = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock(
  '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types',
  () => ({
    UserProfileProperty: {
      HAS_REWARDS_OPTED_IN: 'has_rewards_opted_in',
      OFF: 'off',
    },
  }),
);

const mockShowToast = jest.fn();
const mockWarningToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      warning: mockWarningToast,
      error: mockErrorToast,
    },
  }),
}));

const mockResetAllSessionTrackingForRewardsDashboardModals = jest.fn();

jest.mock('./useRewardDashboardModals', () => ({
  useRewardDashboardModals: () => ({
    resetAllSessionTracking:
      mockResetAllSessionTrackingForRewardsDashboardModals,
  }),
}));

jest.mock('./useBulkLinkState', () => ({
  useBulkLinkState: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.optout.modal.error_message': 'Failed to opt out',
      'rewards.optout.request_received.title': 'Request received',
      'rewards.optout.request_received.description':
        'In about 7 days, your progress will be fully erased.',
    };
    return mockStrings[key] || key;
  }),
}));

describe('useOptout', () => {
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockSubscriptionId = 'mock-subscription-id';

  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockResetRewardsState = resetRewardsState as jest.MockedFunction<
    typeof resetRewardsState
  >;
  const mockUseBulkLinkState = useBulkLinkState as jest.MockedFunction<
    typeof useBulkLinkState
  >;

  const mockCancelBulkLink = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      return undefined;
    });
    (
      useNavigation as jest.MockedFunction<typeof useNavigation>
    ).mockReturnValue({
      navigate: mockNavigate,
    } as unknown as NavigationProp<ParamListBase>);
    mockResetRewardsState.mockReturnValue({
      type: 'rewards/resetRewardsState',
      payload: undefined,
    });
    mockResetAllSessionTrackingForRewardsDashboardModals.mockClear();

    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
    mockTrackEvent.mockClear();
    mockIdentify.mockClear();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
        identify: mockIdentify,
      }),
    );

    mockUseBulkLinkState.mockReturnValue({
      startBulkLink: jest.fn(),
      cancelBulkLink: mockCancelBulkLink,
      resetBulkLink: jest.fn(),
      resumeBulkLink: jest.fn(),
      isRunning: false,
      wasInterrupted: false,
      isCompleted: false,
      hasFailures: false,
      isFullySuccessful: false,
      totalAccounts: 0,
      linkedAccounts: 0,
      failedAccounts: 0,
      accountProgress: 0,
      processedAccounts: 0,
    });
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useOptout());

      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.optout).toBe('function');
    });
  });

  describe('optout', () => {
    it('should handle successful opt-out', async () => {
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(true);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Starting opt-out process',
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out successful, resetting state',
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockResetRewardsState());
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).toHaveBeenCalledTimes(1);

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_COMPLETED,
      );

      expect(mockIdentify).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.OFF,
      });

      // Should navigate to wallet view and show "Request received" toast
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
      expect(mockWarningToast).toHaveBeenCalledWith(
        'Request received',
        'In about 7 days, your progress will be fully erased.',
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);

      expect(result.current.isLoading).toBe(false);
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should handle opt-out failure from controller', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed - controller returned false',
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_FAILED,
      );

      expect(mockIdentify).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle exceptions during opt-out', async () => {
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(false);
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed with exception:',
        testError,
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_FAILED,
      );

      expect(mockIdentify).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should not proceed if already loading', async () => {
      const { result } = renderHook(() => useOptout());

      let resolveSlowPromise: (value: boolean) => void;
      const slowPromise = new Promise<boolean>((resolve) => {
        resolveSlowPromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(slowPromise);

      let firstOptoutPromise: Promise<boolean>;
      await act(async () => {
        firstOptoutPromise = result.current.optout();
      });

      let secondOptoutResult = false;
      await act(async () => {
        secondOptoutResult = await result.current.optout();
      });

      expect(secondOptoutResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSlowPromise?.(true);
        if (firstOptoutPromise) {
          await firstOptoutPromise;
        }
      });
    });

    it('should not proceed if no subscription ID', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) return null;
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(mockCancelBulkLink).not.toHaveBeenCalled();
    });
  });

  describe('Bulk Link Integration', () => {
    it('should cancel bulk link before opt-out', async () => {
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useOptout());

      await act(async () => {
        await result.current.optout();
      });

      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalled();
    });

    it('should cancel bulk link even when opt-out fails', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      await act(async () => {
        await result.current.optout();
      });

      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should cancel bulk link even when opt-out throws exception', async () => {
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useOptout());

      await act(async () => {
        await result.current.optout();
      });

      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined subscription ID', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) return undefined;
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle empty string subscription ID', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) return '';
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should recreate optout callback when subscription ID changes', () => {
      const { result, rerender } = renderHook(() => useOptout());
      const initialOptout = result.current.optout;

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId)
          return 'new-subscription-id';
        return undefined;
      });

      rerender(undefined);

      expect(result.current.optout).not.toBe(initialOptout);
    });
  });
});
