import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
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
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { ModalType } from '../components/RewardsBottomSheetModal';
import Routes from '../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
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
  const mockShowToast = jest.fn();
  const mockCloseToast = jest.fn();

  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockResetRewardsState = resetRewardsState as jest.MockedFunction<
    typeof resetRewardsState
  >;

  const mockToastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: mockCloseToast,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
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

  describe('successful opt-out', () => {
    it('should handle successful opt-out and navigate to rewards view', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Starting opt-out process',
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out successful, resetting state and navigating',
      );

      expect(mockEngineCall).toHaveBeenCalledWith('RewardsController:optOut');
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
      expect(mockNavigate).toHaveBeenCalledWith('RewardsView');
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should log success and perform cleanup actions', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useOptout(mockToastRef));

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Starting opt-out process',
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out successful, resetting state and navigating',
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
      expect(mockNavigate).toHaveBeenCalledWith('RewardsView');
    });
  });

  describe('failed opt-out (API returns false)', () => {
    it('should handle API returning false and show error toast', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout(mockToastRef));

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed - controller returned false',
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: 'Failed to opt out',
            isBold: true,
          },
        ],
        hasNoTimeout: false,
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('RewardsView');
    });

    it('should handle failed opt-out without toast ref gracefully', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed - controller returned false',
      );
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('exception handling', () => {
    it('should handle API exceptions and show error toast', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useOptout(mockToastRef));

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed with exception:',
        mockError,
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: 'An error occurred while opting out',
            isBold: true,
          },
        ],
        hasNoTimeout: false,
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('RewardsView');
    });

    it('should handle exceptions without toast ref gracefully', async () => {
      // Arrange
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useOptout());

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useOptout: Opt-out failed with exception:',
        mockError,
      );
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should handle null toast ref gracefully', async () => {
      // Arrange
      mockEngineCall.mockRejectedValueOnce(new Error('Test error'));
      const nullToastRef = { current: null };

      const { result } = renderHook(() => useOptout(nullToastRef));

      // Act
      await act(async () => {
        await result.current.optout();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('loading state management', () => {
    it('should set loading to true during API call and false after success', async () => {
      // Arrange
      let resolveApiCall: (value: boolean) => void;
      const apiCallPromise = new Promise<boolean>((resolve) => {
        resolveApiCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useOptout());

      // Act - start opt-out
      const optoutPromise = act(async () => {
        await result.current.optout();
      });

      // Assert - loading should be true
      expect(result.current.isLoading).toBe(true);

      // Act - resolve API call
      act(() => {
        resolveApiCall(true);
      });

      // Wait for the promise to resolve
      await optoutPromise;

      // Assert - loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to true during API call and false after error', async () => {
      // Arrange
      let rejectApiCall: (error: Error) => void;
      const apiCallPromise = new Promise<boolean>((_, reject) => {
        rejectApiCall = reject;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useOptout());

      // Act - start opt-out
      const optoutPromise = act(async () => {
        await result.current.optout();
      });

      // Assert - loading should be true
      expect(result.current.isLoading).toBe(true);

      // Act - reject API call
      act(() => {
        rejectApiCall(new Error('Test error'));
      });

      // Wait for the promise to resolve
      await optoutPromise;

      // Assert - loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should prevent concurrent opt-out calls when loading', async () => {
      // Arrange
      let resolveApiCall: (value: boolean) => void;
      const apiCallPromise = new Promise<boolean>((resolve) => {
        resolveApiCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useOptout());

      // Act - start first opt-out
      const firstOptoutPromise = act(async () => {
        await result.current.optout();
      });

      // Assert - should be loading
      expect(result.current.isLoading).toBe(true);

      // Act - try second opt-out while loading
      await act(async () => {
        await result.current.optout();
      });

      // Assert - should only have called engine once
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Act - resolve first call
      act(() => {
        resolveApiCall(true);
      });

      await firstOptoutPromise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('showOptoutBottomSheet functionality', () => {
    it('should navigate to bottom sheet modal with correct parameters', () => {
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
            onPress: result.current.optout,
            variant: ButtonVariant.Primary,
            disabled: false,
          },
        },
      );
    });

    it('should show loading state in confirm button when loading', async () => {
      // Arrange
      let resolveApiCall: (value: boolean) => void;
      const apiCallPromise = new Promise<boolean>((resolve) => {
        resolveApiCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useOptout());

      // Act - start loading
      const optoutPromise = act(async () => {
        await result.current.optout();
      });

      // Act - show bottom sheet while loading
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

      // Cleanup
      act(() => {
        resolveApiCall(true);
      });
      await optoutPromise;
    });

    it('should navigate to default route when onCancel is called without dismissRoute', () => {
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Get the onCancel function
      const onCancelFunction = mockNavigate.mock.calls[0][1].onCancel;

      // Act - call onCancel
      act(() => {
        onCancelFunction();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);
    });

    it('should navigate to custom dismissRoute when onCancel is called', () => {
      const { result } = renderHook(() => useOptout());
      const customDismissRoute = 'CustomRoute';

      // Act
      act(() => {
        result.current.showOptoutBottomSheet(customDismissRoute);
      });

      // Get the onCancel function
      const onCancelFunction = mockNavigate.mock.calls[0][1].onCancel;

      // Act - call onCancel
      act(() => {
        onCancelFunction();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(customDismissRoute);
    });

    it('should use optout function as confirmAction onPress', () => {
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet();
      });

      // Assert
      const confirmAction = mockNavigate.mock.calls[0][1].confirmAction;
      expect(confirmAction.onPress).toBe(result.current.optout);
    });
  });

  describe('hook dependencies and callback stability', () => {
    it('should maintain stable functions when dependencies are unchanged', () => {
      const { result, rerender } = renderHook(() => useOptout());

      const firstOptoutFunction = result.current.optout;
      const firstShowBottomSheetFunction = result.current.showOptoutBottomSheet;

      // Rerender without changing dependencies
      rerender();

      const secondOptoutFunction = result.current.optout;
      const secondShowBottomSheetFunction =
        result.current.showOptoutBottomSheet;

      expect(firstOptoutFunction).toBe(secondOptoutFunction);
      expect(firstShowBottomSheetFunction).toBe(secondShowBottomSheetFunction);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive showOptoutBottomSheet calls', () => {
      const { result } = renderHook(() => useOptout());

      // Act
      act(() => {
        result.current.showOptoutBottomSheet('Route1');
        result.current.showOptoutBottomSheet('Route2');
        result.current.showOptoutBottomSheet('Route3');
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          onCancel: expect.any(Function),
        }),
      );
    });
  });
});
