import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { useOptout } from './useOptout';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { resetRewardsState } from '../../../../reducers/rewards';
import { ModalType } from '../components/RewardsBottomSheetModal';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useBulkLinkState } from './useBulkLinkState';

// Mock dependencies
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

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddTraitsToUser = jest.fn();

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
    addTraitsToUser: mockAddTraitsToUser,
  }),
  MetaMetricsEvents: {
    REWARDS_OPT_OUT_STARTED: 'rewards_opt_out_started',
    REWARDS_OPT_OUT_COMPLETED: 'rewards_opt_out_completed',
    REWARDS_OPT_OUT_FAILED: 'rewards_opt_out_failed',
    REWARDS_PAGE_BUTTON_CLICKED: 'rewards_page_button_clicked',
  },
}));

// Mock utils
jest.mock('../utils', () => ({
  RewardsMetricsButtons: {
    OPT_OUT_CANCEL: 'opt_out_cancel',
  },
}));

// Mock UserProfileProperty
jest.mock(
  '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types',
  () => ({
    UserProfileProperty: {
      HAS_REWARDS_OPTED_IN: 'has_rewards_opted_in',
      OFF: 'off',
    },
  }),
);

// Mock useRewardsToast
const mockShowToast = jest.fn();
const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
      error: mockErrorToast,
    },
  }),
}));

// Mock useRewardDashboardModals
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
      'rewards.optout.error_message': 'An error occurred while opting out',
      'rewards.optout.modal.confirmation_title': 'Are you sure?',
      'rewards.optout.modal.confirmation_description':
        'This action cannot be undone',
      'rewards.optout.modal.processing': 'Processing...',
      'rewards.optout.modal.confirm': 'Confirm',
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
      // Fallback for other selectors not under test
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

    // Setup metrics mocks
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
    mockTrackEvent.mockClear();
    mockAddTraitsToUser.mockClear();

    // Setup useBulkLinkState mock
    mockUseBulkLinkState.mockReturnValue({
      startBulkLink: jest.fn(),
      cancelBulkLink: mockCancelBulkLink,
      resetBulkLink: jest.fn(),
      isRunning: false,
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
      expect(typeof result.current.showOptoutBottomSheet).toBe('function');
    });
  });

  describe('optout', () => {
    it('should handle successful opt-out', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
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

      // Verify metrics tracking
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started and completed
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_COMPLETED,
      );

      // Verify user traits are updated
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.OFF,
      });

      // Navigation should not happen in the optout function itself
      expect(result.current.isLoading).toBe(false);

      // Verify bulk link was cancelled before opt-out
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should handle opt-out failure from controller', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
      expect(optoutResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Starting opt-out process',
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed - controller returned false',
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();

      // Verify metrics tracking for failure
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started and failed
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_FAILED,
      );

      // Verify user traits are NOT updated on failure
      expect(mockAddTraitsToUser).not.toHaveBeenCalled();

      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle exceptions during opt-out', async () => {
      // Arrange
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
      expect(optoutResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Starting opt-out process',
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed with exception:',
        testError,
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();

      // Verify metrics tracking for exception
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started and failed
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_OPT_OUT_FAILED,
      );

      // Verify user traits are NOT updated on exception
      expect(mockAddTraitsToUser).not.toHaveBeenCalled();

      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);

      // Verify bulk link was cancelled before opt-out even on exception
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should not proceed if already loading', async () => {
      // Arrange
      const { result } = renderHook(() => useOptout());

      // Set loading to true by triggering an optout that doesn't resolve immediately
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve(true), 100),
      );
      mockEngineCall.mockReturnValueOnce(slowPromise);

      // Start first opt-out (this will set isLoading to true)
      const firstOptoutPromise = result.current.optout();

      // Act - Try to call optout while already loading
      const secondOptoutResult = await result.current.optout();

      // Assert - Second call should return false immediately without calling controller
      expect(secondOptoutResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledTimes(1); // Only called once from the first optout

      // Clean up the first promise
      await act(async () => {
        await firstOptoutPromise;
      });
    });

    it('should not proceed if no subscription ID', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return null; // No subscription ID
        }
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);

      // Should not cancel bulk link when no subscription ID
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

      // Should cancel bulk link before opt-out
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      expect(mockCancelBulkLink).toHaveBeenCalled();
      expect(mockEngineCall).toHaveBeenCalled();
    });

    it('should cancel bulk link even when opt-out fails', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      await act(async () => {
        await result.current.optout();
      });

      // Should still cancel bulk link even on failure
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should cancel bulk link even when opt-out throws exception', async () => {
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useOptout());

      await act(async () => {
        await result.current.optout();
      });

      // Should still cancel bulk link even on exception
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });

    it('should cancel bulk link when opt-out is called from modal', async () => {
      mockEngineCall.mockResolvedValueOnce(true);
      const { result } = renderHook(() => useOptout());

      // Act - Show the modal
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get the confirmAction onPress function from the modal params
      const modalParams = mockNavigate.mock.calls[0][1];
      const handleOptoutConfirm = modalParams.confirmAction.onPress;

      // Act - Trigger confirm action
      await act(async () => {
        await handleOptoutConfirm();
      });

      // Should cancel bulk link before opt-out
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('showOptoutBottomSheet', () => {
    it('should navigate to bottom sheet modal with correct params', () => {
      // Arrange
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'Are you sure?',
          description: 'This action cannot be undone',
          type: ModalType.Danger,
          onCancel: expect.any(Function),
          confirmAction: {
            label: 'Confirm',
            loadOnPress: true,
            onPress: expect.any(Function),
            variant: ButtonVariant.Primary,
            disabled: false,
          },
        },
      );
    });

    it('should navigate to provided dismissRoute when cancel is pressed', () => {
      // Arrange
      const dismissRoute = 'CustomDismissRoute';
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet(dismissRoute);
      });

      // Get onCancel function from navigate call
      const onCancel = mockNavigate.mock.calls[0][1].onCancel;

      // Act - press cancel
      act(() => {
        onCancel();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(dismissRoute);

      // Verify metrics tracking for cancel
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
    });

    it('should navigate to REWARDS_SETTINGS_VIEW when cancel is pressed with no dismissRoute', () => {
      // Arrange
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get onCancel function from navigate call
      const onCancel = mockNavigate.mock.calls[0][1].onCancel;

      // Act - press cancel
      act(() => {
        onCancel();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);

      // Verify metrics tracking for cancel
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
    });

    it('should call optout when confirm is pressed', () => {
      // Mock implementation of useOptout with a spy
      const optoutSpy = jest.fn();

      // Mock the hook implementation
      jest
        .spyOn(jest.requireActual('./useOptout'), 'useOptout')
        .mockImplementation(() => ({
          optout: optoutSpy,
          isLoading: false,
          showOptoutBottomSheet(dismissRoute?: string) {
            const dismissModal = () => {
              mockNavigate(dismissRoute || Routes.REWARDS_SETTINGS_VIEW);
            };

            mockNavigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
              title: 'Are you sure?',
              description: 'This action cannot be undone',
              type: ModalType.Danger,
              onCancel: dismissModal,
              confirmAction: {
                label: 'Confirm',
                onPress: this.optout,
                variant: ButtonVariant.Primary,
                disabled: false,
              },
            });
          },
        }));

      // Render the hook
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get onPress function from navigate call
      const onPress = mockNavigate.mock.calls[0][1].confirmAction.onPress;

      // Act - press confirm
      act(() => {
        onPress();
      });

      // Assert
      expect(optoutSpy).toHaveBeenCalled();
    });

    it('should show processing label when loading', () => {
      // Mock implementation of useOptout with loading state
      jest
        .spyOn(jest.requireActual('./useOptout'), 'useOptout')
        .mockImplementation(() => ({
          optout: jest.fn(),
          isLoading: true,
          showOptoutBottomSheet(dismissRoute?: string) {
            const dismissModal = () => {
              mockNavigate(dismissRoute || Routes.REWARDS_SETTINGS_VIEW);
            };

            mockNavigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
              title: 'Are you sure?',
              description: 'This action cannot be undone',
              type: ModalType.Danger,
              onCancel: dismissModal,
              confirmAction: {
                label: 'Processing...',
                loadOnPress: true,
                onPress: this.optout,
                variant: ButtonVariant.Primary,
                disabled: true,
              },
            });
          },
        }));

      // Render the hook
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          confirmAction: expect.objectContaining({
            label: 'Processing...',
            loadOnPress: true,
            disabled: true,
          }),
        }),
      );
    });

    it('should navigate to WALLET_VIEW after successful opt-out from modal', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);
      const { result } = renderHook(() => useOptout());

      // Act - Show the modal
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get the confirmAction onPress function from the modal params
      const modalParams = mockNavigate.mock.calls[0][1];
      const handleOptoutConfirm = modalParams.confirmAction.onPress;

      // Act - Trigger confirm action (this should call optout and navigate on success)
      await act(async () => {
        await handleOptoutConfirm();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockResetRewardsState());
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('should not navigate after failed opt-out from modal', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);
      const { result } = renderHook(() => useOptout());

      // Reset navigate mock to only track calls after modal is shown
      jest.clearAllMocks();

      // Act - Show the modal
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get the confirmAction onPress function from the modal params
      const modalParams = mockNavigate.mock.calls[0][1];
      const handleOptoutConfirm = modalParams.confirmAction.onPress;

      // Act - Trigger confirm action (this should call optout but not navigate on failure)
      await act(async () => {
        await handleOptoutConfirm();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();
      // Should not navigate to WALLET_VIEW after failure
      expect(mockNavigate).toHaveBeenCalledTimes(1); // Only the initial modal navigation
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('should not navigate after exception during opt-out from modal', async () => {
      // Arrange
      const testError = new Error('Controller error');
      mockEngineCall.mockRejectedValueOnce(testError);
      const { result } = renderHook(() => useOptout());

      // Reset navigate mock to only track calls after modal is shown
      jest.clearAllMocks();

      // Act - Show the modal
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get the confirmAction onPress function from the modal params
      const modalParams = mockNavigate.mock.calls[0][1];
      const handleOptoutConfirm = modalParams.confirmAction.onPress;

      // Act - Trigger confirm action (this should call optout but not navigate on exception)
      await act(async () => {
        await handleOptoutConfirm();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();
      // Should not navigate to WALLET_VIEW after exception
      expect(mockNavigate).toHaveBeenCalledTimes(1); // Only the initial modal navigation
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  describe('edge cases and scenarios', () => {
    it('should handle empty/undefined subscription ID', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
    });

    it('should handle empty string subscription ID', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return '';
        }
        return undefined;
      });

      const { result } = renderHook(() => useOptout());

      // Act
      let optoutResult: boolean | undefined;
      await act(async () => {
        optoutResult = await result.current.optout();
      });

      // Assert
      expect(optoutResult).toBe(false);
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(
        mockResetAllSessionTrackingForRewardsDashboardModals,
      ).not.toHaveBeenCalled();
    });

    it('should show correct modal params with custom dismiss route', () => {
      // Arrange
      const customDismissRoute = 'CustomRoute';
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet(customDismissRoute);
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'Are you sure?',
          description: 'This action cannot be undone',
          type: ModalType.Danger,
          onCancel: expect.any(Function),
          confirmAction: expect.objectContaining({
            label: 'Confirm',
            loadOnPress: true,
            onPress: expect.any(Function),
            variant: ButtonVariant.Primary,
            disabled: false,
          }),
        }),
      );

      // Test the cancel action with custom dismiss route
      const onCancel = mockNavigate.mock.calls[0][1].onCancel;
      act(() => {
        onCancel();
      });

      expect(mockNavigate).toHaveBeenCalledWith(customDismissRoute);
    });

    it('should handle multiple rapid calls to showOptoutBottomSheet', () => {
      // Arrange
      const { result } = renderHook(() => useOptout());

      // Act - Call showOptoutBottomSheet multiple times rapidly
      act(() => {
        result.current.showOptoutBottomSheet('Route1');
        result.current.showOptoutBottomSheet('Route2');
        result.current.showOptoutBottomSheet('Route3');
      });

      // Assert - Should have been called 3 times, with the last call using 'Route3'
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.any(Object),
      );
    });
  });

  describe('callback dependencies and memoization', () => {
    it('should recreate optout callback when dependencies change', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useOptout());
      const initialOptout = result.current.optout;

      // Change subscription ID
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return 'new-subscription-id';
        }
        return undefined;
      });

      // Act
      rerender();

      // Assert
      expect(result.current.optout).not.toBe(initialOptout);
    });

    it('should recreate showOptoutBottomSheet callback when dependencies change', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useOptout());
      const initialShowOptoutBottomSheet = result.current.showOptoutBottomSheet;

      // Simulate loading state change by mocking a loading scenario
      let resolveController: (value: boolean) => void;
      const controllerPromise = new Promise<boolean>((resolve) => {
        resolveController = resolve;
      });
      mockEngineCall.mockReturnValueOnce(controllerPromise);

      // Start optout to change loading state
      act(() => {
        result.current.optout();
      });

      // Act - Rerender to see if callback changed
      rerender();

      // Assert - The callback should be different due to isLoading dependency change
      expect(result.current.showOptoutBottomSheet).not.toBe(
        initialShowOptoutBottomSheet,
      );

      // Clean up
      act(async () => {
        resolveController?.(true);
      });
    });
  });
});
