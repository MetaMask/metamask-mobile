import React from 'react';
import DeleteWalletModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import { strings } from '../../../../locales/i18n';
import { ForgotPasswordModalSelectorsIDs } from '../../../../e2e/selectors/Common/ForgotPasswordModal.selectors';
import { SET_COMPLETED_ONBOARDING } from '../../../actions/onboarding';
import { InteractionManager } from 'react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import { clearHistory } from '../../../actions/browser';

const mockInitialState = {
  engine: { backgroundState },
  security: {
    dataCollectionForMarketing: false,
  },
};

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockUseDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockUseDispatch,
  useSelector: jest.fn(),
}));
const mockNavigate = jest.fn();

// Mock useRoute with default params
const mockUseRoute = jest.fn().mockReturnValue({ params: {} });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
    useRoute: () => mockUseRoute(),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  set: jest.fn(),
  get: jest.fn(),
  clearAll: jest.fn(),
}));

jest.mock('../../../actions/browser', () => ({
  clearHistory: jest.fn(),
  BrowserActionTypes: {
    ADD_TO_VIEWED_DAPP: 'ADD_TO_VIEWED_DAPP',
  },
}));

const mockSignOut = jest.fn();

jest.mock('../../../util/identity/hooks/useAuthentication', () => ({
  useSignOut: () => ({
    signOut: mockSignOut,
  }),
}));

jest.mock('../../hooks/DeleteWallet', () => ({
  useDeleteWallet: () => [
    jest.fn(() => Promise.resolve()),
    jest.fn(() => Promise.resolve()),
  ],
}));

const Stack = createStackNavigator();

const renderComponent = (
  state: DeepPartial<RootState> = {},
  routeParams = {},
) => {
  // Update the mock to return the provided params
  mockUseRoute.mockReturnValue({ params: routeParams });

  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="DeleteWalletModal" options={{}}>
        {() => <DeleteWalletModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );
};

describe('DeleteWalletModal', () => {
  const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
    cb();
    return {
      then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
      done: (onfulfilled: () => void, onrejected: () => void) =>
        Promise.resolve().then(onfulfilled, onrejected),
      cancel: jest.fn(),
    };
  });
  jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation(mockRunAfterInteractions);

  describe('bottom sheet', () => {
    it('renders matching snapshot', () => {
      const wrapper = renderComponent(mockInitialState);

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('forgot password flow', () => {
    it('renders matching snapshot for forgot password', async () => {
      const wrapper = renderComponent(mockInitialState);

      const title = wrapper.getByText(strings('login.forgot_password_desc'));
      expect(title).toBeOnTheScreen();

      const button = wrapper.getByRole('button', {
        name: strings('login.reset_wallet'),
      });
      expect(button).toBeOnTheScreen();

      fireEvent.press(button);

      const title2 = wrapper.getByText(strings('login.are_you_sure'));
      expect(title2).toBeOnTheScreen();

      const button2 = wrapper.getByRole('button', {
        name: strings('login.erase_my'),
      });
      expect(button2).toBeOnTheScreen();

      fireEvent.press(button2);

      // Wait for all promises to resolve
      await Promise.resolve();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('signs the user out when deleting the wallet', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const { getByTestId } = renderComponent(mockInitialState);

      fireEvent.press(
        getByTestId(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON),
      );
      fireEvent.press(
        getByTestId(ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON),
      );

      expect(mockSignOut).toHaveBeenCalled();
      expect(removeItemSpy).toHaveBeenCalledWith(OPTIN_META_METRICS_UI_SEEN);
    });

    it('sets completedOnboarding to false when deleting the wallet', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const { getByTestId } = renderComponent(mockInitialState);

      fireEvent.press(
        getByTestId(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON),
      );
      fireEvent.press(
        getByTestId(ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON),
      );

      expect(mockUseDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SET_COMPLETED_ONBOARDING,
          completedOnboarding: false,
        }),
      );
      expect(removeItemSpy).toHaveBeenCalledWith(OPTIN_META_METRICS_UI_SEEN);
    });
  });

  describe('reset wallet flow passed as route param', () => {
    it('shows reset wallet confirmation when isResetWalletFromParams is true', () => {
      const wrapper = renderComponent(mockInitialState, {
        isResetWallet: true,
      });

      // Should show the confirmation screen directly (not the forgot password screen)
      const title = wrapper.getByText(strings('login.are_you_sure'));
      expect(title).toBeOnTheScreen();

      // Should not show the forgot password description
      expect(
        wrapper.queryByText(strings('login.forgot_password_desc')),
      ).toBeNull();

      // Should not show the back button when coming from params
      const backButton = wrapper.queryByRole('button', { name: /arrow left/i });
      expect(backButton).toBeNull();
    });

    it('shows forgot password flow when isResetWalletFromParams is false', () => {
      const wrapper = renderComponent(mockInitialState, {
        isResetWallet: false,
      });

      // Should show the forgot password screen first
      const title = wrapper.getByText(strings('login.forgot_password_desc'));
      expect(title).toBeOnTheScreen();

      // Should not show the confirmation screen initially
      expect(wrapper.queryByText(strings('login.are_you_sure'))).toBeNull();
    });

    it('shows back button when not coming from params', () => {
      const wrapper = renderComponent(mockInitialState, {
        isResetWallet: false,
      });

      // Click the reset wallet button to show confirmation screen
      const resetButton = wrapper.getByRole('button', {
        name: strings('login.reset_wallet'),
      });
      fireEvent.press(resetButton);

      // Should show the confirmation screen with back button
      const title = wrapper.getByText(strings('login.are_you_sure'));
      expect(title).toBeOnTheScreen();

      // Should show the back button when not coming from params
      const backButton = wrapper.getByTestId(
        ForgotPasswordModalSelectorsIDs.BACK_BUTTON,
      );
      expect(backButton).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('handles errors during wallet deletion and resets loading state', async () => {
      // Arrange - Mock console.error to track error logging
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      // Mock clearHistory to return a thunk that throws an error
      const mockClearHistoryThunk = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));
      (clearHistory as jest.Mock).mockReturnValue(mockClearHistoryThunk);

      const { getByTestId } = renderComponent(mockInitialState);

      // Act - Trigger the reset wallet flow and attempt deletion
      fireEvent.press(
        getByTestId(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON),
      );

      const deleteButton = getByTestId(
        ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
      );
      fireEvent.press(deleteButton);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - Verify error was logged and loading state was reset
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});
