import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import usePromptSeedlessRelogin from './usePromptSeedlessRelogin';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import storageWrapper from '../../../store/storage-wrapper';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import { clearHistory } from '../../../actions/browser';
import { setCompletedOnboarding } from '../../../actions/onboarding';

// Mock dependencies
jest.mock('../useMetrics');
jest.mock('../../../util/identity/hooks/useAuthentication');
jest.mock('../DeleteWallet');
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('../../../actions/browser');
jest.mock('../../../actions/onboarding');

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
}));

// Mock imports
import { useMetrics } from '../useMetrics';
import { useSignOut } from '../../../util/identity/hooks/useAuthentication';
import { useDeleteWallet } from '../DeleteWallet';

const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockUseSignOut = useSignOut as jest.MockedFunction<typeof useSignOut>;
const mockUseDeleteWallet = useDeleteWallet as jest.MockedFunction<
  typeof useDeleteWallet
>;
const mockStorageWrapper = storageWrapper as jest.Mocked<typeof storageWrapper>;
const mockClearHistory = clearHistory as jest.MockedFunction<
  typeof clearHistory
>;
const mockSetCompletedOnboarding =
  setCompletedOnboarding as jest.MockedFunction<typeof setCompletedOnboarding>;

describe('usePromptSeedlessRelogin', () => {
  const mockStore = configureMockStore([thunk]);
  const mockSignOut = jest.fn();
  const mockResetWalletState = jest.fn();
  const mockDeleteUser = jest.fn();
  const mockMetrics = {
    isEnabled: jest.fn().mockReturnValue(true),
    trackEvent: jest.fn(),
    enable: jest.fn(),
    addTraitsToUser: jest.fn(),
    createDataDeletionTask: jest.fn(),
    checkDataDeleteStatus: jest.fn(),
    getDeleteRegulationCreationDate: jest.fn(),
    getDeleteRegulationId: jest.fn(),
    isDataRecorded: jest.fn(),
    getMetaMetricsId: jest.fn(),
    createEventBuilder: jest.fn(),
  };

  const initialState = {
    security: {
      dataCollectionForMarketing: true,
    },
  };

  const store = mockStore(initialState);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderHookWithProvider = (hook: () => any) =>
    renderHook(hook, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    store.clearActions();

    // Setup mocks
    mockUseMetrics.mockReturnValue(mockMetrics);
    mockUseSignOut.mockReturnValue({ signOut: mockSignOut });
    mockUseDeleteWallet.mockReturnValue([mockResetWalletState, mockDeleteUser]);
    (mockStorageWrapper.removeItem as jest.Mock).mockResolvedValue(undefined);
    mockClearHistory.mockReturnValue({
      type: 'CLEAR_BROWSER_HISTORY',
      id: expect.any(Number),
      metricsEnabled: expect.any(Boolean),
      marketingEnabled: expect.any(Boolean),
    });
    mockSetCompletedOnboarding.mockReturnValue({
      type: 'SET_COMPLETED_ONBOARDING',
      completedOnboarding: expect.any(Boolean),
    });
  });

  describe('hook initialization', () => {
    it('returns correct initial state and functions', () => {
      // Arrange & Act
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      // Assert
      expect(result.current).toEqual({
        isDeletingInProgress: false,
        deleteWalletError: null,
        promptSeedlessRelogin: expect.any(Function),
      });
    });

    it('initializes with isDeletingInProgress as false', () => {
      // Arrange & Act
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      // Assert
      expect(result.current.isDeletingInProgress).toBe(false);
    });
  });

  describe('promptSeedlessRelogin', () => {
    it('navigates to error sheet with correct parameters', () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      // Act
      act(() => {
        result.current.promptSeedlessRelogin();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          type: 'error',
          title: strings('login.seedless_controller_error_prompt_title'),
          description: strings(
            'login.seedless_controller_error_prompt_description',
          ),
          primaryButtonLabel: strings(
            'login.seedless_controller_error_prompt_primary_button_label',
          ),
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });
    });

    it('creates error sheet with correct string translations', () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      // Act
      act(() => {
        result.current.promptSeedlessRelogin();
      });

      // Assert
      const callArgs = mockNavigate.mock.calls[0][1];
      const params = callArgs.params;

      expect(params.title).toBe(
        strings('login.seedless_controller_error_prompt_title'),
      );
      expect(params.description).toBe(
        strings('login.seedless_controller_error_prompt_description'),
      );
      expect(params.primaryButtonLabel).toBe(
        strings('login.seedless_controller_error_prompt_primary_button_label'),
      );
    });
  });

  describe('primary button press flow', () => {
    it('executes complete deletion flow when primary button is pressed', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      expect(mockClearHistory).toHaveBeenCalledWith(true, true);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockResetWalletState).toHaveBeenCalledTimes(1);
      expect(mockDeleteUser).toHaveBeenCalledTimes(1);
      expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
        OPTIN_META_METRICS_UI_SEEN,
      );
      expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(false);
    });

    it('navigates to onboarding root after deletion flow', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      expect(mockReset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            state: {
              routes: [
                {
                  name: Routes.ONBOARDING.NAV,
                  params: {
                    screen: Routes.ONBOARDING.ONBOARDING,
                    params: { delete: true },
                  },
                },
              ],
            },
          },
        ],
      });
    });

    it('dispatches Redux actions in correct order', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      const actions = store.getActions();
      expect(actions).toEqual([
        {
          type: 'CLEAR_BROWSER_HISTORY',
          id: expect.any(Number),
          metricsEnabled: expect.any(Boolean),
          marketingEnabled: expect.any(Boolean),
        },
        {
          type: 'SET_COMPLETED_ONBOARDING',
          completedOnboarding: expect.any(Boolean),
        },
      ]);
    });

    it('uses correct metrics and marketing data collection settings', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      expect(mockClearHistory).toHaveBeenCalledWith(
        mockMetrics.isEnabled(),
        true, // dataCollectionForMarketing from state
      );
    });
  });

  describe('loading state management', () => {
    it('sets isDeletingInProgress to true during deletion flow', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      // Make resetWalletState async to test loading state
      let resolveResetWallet: () => void;
      const resetWalletPromise = new Promise<void>((resolve) => {
        resolveResetWallet = resolve;
      });
      mockResetWalletState.mockReturnValue(resetWalletPromise);

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act - start deletion process but don't await
      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = onPrimaryButtonPress() || Promise.resolve();
      });

      // Assert - check loading state is true during deletion
      expect(result.current.isDeletingInProgress).toBe(true);

      // Complete the reset wallet operation
      act(() => {
        resolveResetWallet();
      });

      // Wait for completion
      await act(async () => {
        await deletePromise;
      });

      // Assert - check loading state is false after completion
      expect(result.current.isDeletingInProgress).toBe(false);
    });

    it('resets isDeletingInProgress to false after deletion completes', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      expect(result.current.isDeletingInProgress).toBe(false);
    });
  });

  describe('error handling', () => {
    it('resets loading state when deletion flow fails', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );
      mockResetWalletState.mockRejectedValueOnce(new Error('Reset failed'));

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act - call the function which catches errors internally
      await act(async () => {
        onPrimaryButtonPress();
        // Wait a bit for the async error handling to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert - loading state is reset to false after error
      expect(result.current.isDeletingInProgress).toBe(false);
      // Assert - error state is set
      expect(result.current.deleteWalletError).toEqual(
        new Error('Reset failed'),
      );
    });

    it('handles storage removal failure gracefully', async () => {
      // Arrange
      const { result } = renderHookWithProvider(() =>
        usePromptSeedlessRelogin(),
      );
      (mockStorageWrapper.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act - call the function which catches errors internally
      await act(async () => {
        onPrimaryButtonPress();
        // Wait a bit for the async error handling to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert - error state is set
      expect(result.current.deleteWalletError).toEqual(
        new Error('Storage error'),
      );
      // Assert other operations were still attempted
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockResetWalletState).toHaveBeenCalledTimes(1);
    });
  });

  describe('selector integration', () => {
    it('uses dataCollectionForMarketing from Redux state', async () => {
      // Arrange
      const stateWithMarketingDisabled = {
        security: {
          dataCollectionForMarketing: false,
        },
      };
      const storeWithMarketingDisabled = mockStore(stateWithMarketingDisabled);

      const { result } = renderHook(() => usePromptSeedlessRelogin(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Provider store={storeWithMarketingDisabled}>{children}</Provider>
        ),
      });

      act(() => {
        result.current.promptSeedlessRelogin();
      });

      const callArgs = mockNavigate.mock.calls[0][1];
      const onPrimaryButtonPress = callArgs.params.onPrimaryButtonPress;

      // Act
      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Assert
      expect(mockClearHistory).toHaveBeenCalledWith(
        mockMetrics.isEnabled(),
        false, // dataCollectionForMarketing disabled
      );
    });
  });
});
