import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useLinkAccount } from './useLinkAccount';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { IconColor } from '../../../../component-library/components/Icons/Icon/Icon.types';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button/Button.types';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const mockStrings: Record<string, string> = {
      'rewards.settings.link_account_success_title': `${params?.accountName} linked successfully`,
      'rewards.settings.link_account_error_title': 'Failed to link account',
      'rewards.toast_dismiss': 'Dismiss',
    };
    return mockStrings[key] || key;
  }),
}));

describe('useLinkAccount', () => {
  const mockShowToast = jest.fn();
  const mockCloseToast = jest.fn();
  const mockToastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: mockCloseToast,
    },
  };

  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;

  const mockAccount: InternalAccount = {
    id: 'account-1',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  } as InternalAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef });
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useLinkAccount());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.linkAccount).toBe('function');
    });
  });

  describe('successful account linking', () => {
    it('should handle successful account linking and show success toast', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Check,
        iconColor: IconColor.Success,
        labelOptions: [
          {
            label: 'Test Account linked successfully',
          },
        ],
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: 'Dismiss',
          onPress: expect.any(Function),
        },
      });
    });

    it('should call closeToast when success toast close button is pressed', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Get the onPress function from the close button
      const closeButtonOnPress =
        mockShowToast.mock.calls[0][0].closeButtonOptions.onPress;

      // Act - press close button
      act(() => {
        closeButtonOnPress();
      });

      // Assert
      expect(mockCloseToast).toHaveBeenCalled();
    });
  });

  describe('failed account linking (API returns false)', () => {
    it('should handle API returning false and show error toast', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to link account');

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CircleX,
        iconColor: IconColor.Error,
        labelOptions: [{ label: 'Failed to link account' }],
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: 'Dismiss',
          onPress: expect.any(Function),
        },
      });
    });

    it('should call closeToast when error toast close button is pressed', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Get the onPress function from the close button
      const closeButtonOnPress =
        mockShowToast.mock.calls[0][0].closeButtonOptions.onPress;

      // Act - press close button
      act(() => {
        closeButtonOnPress();
      });

      // Assert
      expect(mockCloseToast).toHaveBeenCalled();
    });
  });

  describe('exception handling', () => {
    it('should handle Error instance and show error toast with error message', async () => {
      // Arrange
      const mockError = new Error('Network connection failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Network connection failed');

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useLinkAccount: Failed to link account',
        mockError,
      );

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CircleX,
        iconColor: IconColor.Error,
        labelOptions: [{ label: 'Failed to link account' }],
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: 'Dismiss',
          onPress: expect.any(Function),
        },
      });
    });

    it('should handle non-Error exception and show error toast with generic message', async () => {
      // Arrange
      const mockError = 'String error';
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Unknown error occurred');

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useLinkAccount: Failed to link account',
        mockError,
      );
    });

    it('should call closeToast when exception error toast close button is pressed', async () => {
      // Arrange
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Get the onPress function from the close button
      const closeButtonOnPress =
        mockShowToast.mock.calls[0][0].closeButtonOptions.onPress;

      // Act - press close button
      act(() => {
        closeButtonOnPress();
      });

      // Assert
      expect(mockCloseToast).toHaveBeenCalled();
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

      const { result } = renderHook(() => useLinkAccount());

      // Act - start linking
      const linkPromise = act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - loading should be true
      expect(result.current.isLoading).toBe(true);

      // Act - resolve API call
      act(() => {
        resolveApiCall(true);
      });

      // Wait for the promise to resolve
      await linkPromise;

      // Assert - loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to true during API call and false after failure', async () => {
      // Arrange
      let resolveApiCall: (value: boolean) => void;
      const apiCallPromise = new Promise<boolean>((resolve) => {
        resolveApiCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useLinkAccount());

      // Act - start linking
      const linkPromise = act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - loading should be true
      expect(result.current.isLoading).toBe(true);

      // Act - resolve API call with failure
      act(() => {
        resolveApiCall(false);
      });

      // Wait for the promise to resolve
      await linkPromise;

      // Assert - loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to true during API call and false after exception', async () => {
      // Arrange
      let rejectApiCall: (error: Error) => void;
      const apiCallPromise = new Promise<boolean>((_, reject) => {
        rejectApiCall = reject;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useLinkAccount());

      // Act - start linking
      const linkPromise = act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - loading should be true
      expect(result.current.isLoading).toBe(true);

      // Act - reject API call
      act(() => {
        rejectApiCall(new Error('Test error'));
      });

      // Wait for the promise to resolve
      await linkPromise;

      // Assert - loading should be false
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('state reset behavior', () => {
    it('should reset error state when starting a new link operation', async () => {
      // Arrange - first call that fails
      mockEngineCall.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useLinkAccount());

      // Act - first failed attempt
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - should have error state
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('First error');

      // Arrange - second call that succeeds
      mockEngineCall.mockResolvedValueOnce(true);

      // Act - second successful attempt
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - error state should be reset
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset error state even if subsequent call also fails', async () => {
      // Arrange - first call that fails
      mockEngineCall.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useLinkAccount());

      // Act - first failed attempt
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - should have first error
      expect(result.current.error).toBe('First error');

      // Arrange - second call that also fails
      mockEngineCall.mockRejectedValueOnce(new Error('Second error'));

      // Act - second failed attempt
      await act(async () => {
        await result.current.linkAccount(mockAccount);
      });

      // Assert - should have second error (state was reset)
      expect(result.current.error).toBe('Second error');
    });
  });

  describe('toastRef context variations', () => {
    it('should handle missing toastRef gracefully on success', async () => {
      // Arrange
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should handle missing toastRef gracefully on API failure', async () => {
      // Arrange
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to link account');
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should handle missing toastRef gracefully on exception', async () => {
      // Arrange
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Test error');
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useLinkAccount: Failed to link account',
        mockError,
      );
    });

    it('should handle missing toastRef.current gracefully', async () => {
      // Arrange
      (useContext as jest.Mock).mockReturnValue({
        toastRef: { current: null },
      });
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(true);
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('useCallback dependency', () => {
    it('should maintain stable function reference when toastRef is stable', () => {
      const { result, rerender } = renderHook(() => useLinkAccount());

      const firstLinkAccount = result.current.linkAccount;

      // Rerender without changing toastRef
      rerender();

      const secondLinkAccount = result.current.linkAccount;

      expect(firstLinkAccount).toBe(secondLinkAccount);
    });

    it('should update function reference when toastRef changes', () => {
      const { result, rerender } = renderHook(() => useLinkAccount());

      const firstLinkAccount = result.current.linkAccount;

      // Change toastRef
      const newToastRef = {
        current: {
          showToast: jest.fn(),
          closeToast: jest.fn(),
        },
      };
      (useContext as jest.Mock).mockReturnValue({ toastRef: newToastRef });

      rerender();

      const secondLinkAccount = result.current.linkAccount;

      expect(firstLinkAccount).not.toBe(secondLinkAccount);
    });
  });

  describe('edge cases', () => {
    it('should handle account with special characters in name', async () => {
      // Arrange
      const specialAccount = {
        ...mockAccount,
        metadata: {
          ...mockAccount.metadata,
          name: 'Account with "quotes" & symbols',
        },
      };
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      await act(async () => {
        await result.current.linkAccount(specialAccount);
      });

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: 'Account with "quotes" & symbols linked successfully',
            },
          ],
        }),
      );
    });

    it('should handle multiple simultaneous calls correctly', async () => {
      // Arrange
      let resolveFirst: (value: boolean) => void;
      let resolveSecond: (value: boolean) => void;

      const firstPromise = new Promise<boolean>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<boolean>((resolve) => {
        resolveSecond = resolve;
      });

      mockEngineCall
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useLinkAccount());

      // Act - start both calls
      let firstResult: boolean | undefined;
      let secondResult: boolean | undefined;

      const firstCallPromise = act(async () => {
        firstResult = await result.current.linkAccount(mockAccount);
      });

      const secondCallPromise = act(async () => {
        secondResult = await result.current.linkAccount(mockAccount);
      });

      // Assert - should be loading
      expect(result.current.isLoading).toBe(true);

      // Act - resolve both
      act(() => {
        resolveFirst(true);
        resolveSecond(false);
      });

      // Wait for both to complete
      await Promise.all([firstCallPromise, secondCallPromise]);

      // Assert
      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true); // Last call determines final state
    });
  });
});
