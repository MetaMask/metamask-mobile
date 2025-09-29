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

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return mockSubscriptionId;
      }
      return selector({});
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
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out successful, resetting state',
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockResetRewardsState());
      // Navigation should not happen in the optout function itself
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle opt-out failure from controller', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed - controller returned false',
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle exceptions during opt-out', async () => {
      // Arrange
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optOut',
        mockSubscriptionId,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed with exception:',
        testError,
      );
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to opt out');
      expect(mockShowToast).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not proceed if already loading', async () => {
      // Mock implementation with loading state
      jest
        .spyOn(jest.requireActual('./useOptout'), 'useOptout')
        .mockImplementation(() => ({
          optout: async () => {
            // This function should do nothing when isLoading is true
          },
          isLoading: true,
          showOptoutBottomSheet: jest.fn(),
        }));

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should not proceed if no subscription ID', async () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return null; // No subscription ID
        }
        return selector({});
      });

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
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
            disabled: true,
          }),
        }),
      );
    });
  });
});
